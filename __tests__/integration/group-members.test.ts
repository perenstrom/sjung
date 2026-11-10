import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { GroupClaim } from "@/app/generated/prisma/client";
import { testPrisma } from "../support/db";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";
import { createAccessScenario, createGroup, createUser, grantClaims } from "../support/fixtures";
import { emailedLinkToken, failEmailsTo, resetFakeEmail, sentEmails } from "../support/fake-email";
import { getInvitationView, inviteToGroup } from "@/lib/invitations/invitations";
import { INVITATION_PATH } from "@/lib/invitations/routes";
import {
  inviteMemberToGroup,
  deleteGroup,
  getGroups,
  listGroupInvitations,
  listGroupMembers,
  removeMemberFromGroup,
  resendGroupInvitation,
  revokeGroupInvitation,
  setMemberClaims,
  updateGroup,
} from "@/app/actions/groups";

const FORBIDDEN = "Du har inte behörighet att hantera medlemmar i gruppen";

/** Access scenario plus a second plain member, and a manager holding the given Claims. */
async function createManagerScenario(managerClaims: GroupClaim[] = ["MANAGE_MEMBERS"]) {
  const scenario = await createAccessScenario();
  const { group, member: manager } = scenario;
  await grantClaims(manager.id, group.id, managerClaims);
  const other = await createUser();
  await testPrisma.usersToGroups.create({ data: { userId: other.id, groupId: group.id } });
  return { ...scenario, manager, other };
}

/** A `setMemberClaims` request: the full Claim set the target should end up with. */
function claimsFormData(groupSlug: string, memberUserId: string, claims: GroupClaim[]): FormData {
  const fd = formData({ groupSlug, memberUserId });
  for (const claim of claims) {
    fd.append("claims", claim);
  }
  return fd;
}

async function claimsOf(userId: string, groupId: string) {
  const rows = await testPrisma.groupMemberClaim.findMany({
    where: { userId, groupId },
    select: { claim: true },
    orderBy: { claim: "asc" },
  });
  return rows.map((row) => row.claim);
}

async function isMember(userId: string, groupId: string) {
  const row = await testPrisma.usersToGroups.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return row !== null;
}

describe("membership management by a MANAGE_MEMBERS holder", () => {
  it("lists the group's members", async () => {
    const { group, creator, manager, other } = await createManagerScenario();
    actAs(manager.id);

    const members = await listGroupMembers(group.slug);

    expect(members.map((m) => m.id).sort()).toEqual(
      [creator.id, manager.id, other.id].sort()
    );
  });

  it("lists each member's Claims and marks only the Creator", async () => {
    const { group, creator, manager, other } = await createManagerScenario([
      "MANAGE_CONTENT",
      "MANAGE_MEMBERS",
    ]);
    actAs(manager.id);

    const members = await listGroupMembers(group.slug);
    const byId = new Map(members.map((m) => [m.id, m]));

    expect(byId.get(creator.id)).toMatchObject({ isCreator: true, claims: [] });
    expect(byId.get(manager.id)).toMatchObject({
      isCreator: false,
      claims: ["MANAGE_MEMBERS", "MANAGE_CONTENT"],
    });
    expect(byId.get(other.id)).toMatchObject({ isCreator: false, claims: [] });
  });

  it("invites an existing user by email without adding them yet", async () => {
    const { group, manager, nonMember } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      inviteMemberToGroup(null, formData({ groupSlug: group.slug, email: nonMember.email }))
    ).resolves.toEqual({ status: "sent", email: nonMember.email });

    expect(sentEmails().map((email) => email.to)).toEqual([nonMember.email]);
    expect(await isMember(nonMember.id, group.id)).toBe(false);
  });

  it("answers the same for an address with no account as for one with an account", async () => {
    const { group, manager } = await createManagerScenario();
    await createUser({ email: "har-konto@example.com" });
    actAs(manager.id);

    const known = await inviteMemberToGroup(
      null,
      formData({ groupSlug: group.slug, email: "har-konto@example.com" })
    );
    const unknown = await inviteMemberToGroup(
      null,
      formData({ groupSlug: group.slug, email: "saknar-konto@example.com" })
    );

    expect(known).toEqual({ status: "sent", email: "har-konto@example.com" });
    expect(unknown).toEqual({ status: "sent", email: "saknar-konto@example.com" });
  });

  it("refuses to invite a current Member", async () => {
    const { group, manager, other } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      inviteMemberToGroup(null, formData({ groupSlug: group.slug, email: other.email }))
    ).resolves.toEqual({
      status: "error",
      error: "Användaren är redan medlem i gruppen",
      values: { email: other.email },
    });
    expect(sentEmails()).toHaveLength(0);
  });

  it("refuses a second invitation to the same address within a minute", async () => {
    const { group, manager } = await createManagerScenario();
    actAs(manager.id);
    const invite = () =>
      inviteMemberToGroup(null, formData({ groupSlug: group.slug, email: "ny@example.com" }));

    await invite();

    await expect(invite()).resolves.toMatchObject({
      status: "error",
      error: expect.stringMatching(/^Vänta \d+ sekunder innan du skickar inbjudan igen$/),
    });
    expect(sentEmails()).toHaveLength(1);
  });

  it("asks the inviter to try again when the email can't be sent", async () => {
    const { group, manager } = await createManagerScenario();
    failEmailsTo("ny@example.com");
    actAs(manager.id);

    await expect(
      inviteMemberToGroup(null, formData({ groupSlug: group.slug, email: "ny@example.com" }))
    ).resolves.toEqual({
      status: "error",
      error: "Kunde inte skicka inbjudan, försök igen",
      values: { email: "ny@example.com" },
    });
  });

  it("rejects something that isn't an email address", async () => {
    const { group, manager } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      inviteMemberToGroup(null, formData({ groupSlug: group.slug, email: "inte en adress" }))
    ).resolves.toEqual({
      status: "error",
      error: "Ange en giltig e-postadress",
      values: { email: "inte en adress" },
    });
    expect(sentEmails()).toHaveLength(0);
  });

  it("removes a non-creator member", async () => {
    const { group, manager, other } = await createManagerScenario();
    actAs(manager.id);

    await removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: other.id }));

    expect(await isMember(other.id, group.id)).toBe(false);
  });
});

describe("membership management by a member without MANAGE_MEMBERS", () => {
  it.each<[string, GroupClaim[]]>([
    ["no Claim", []],
    ["only MANAGE_CONTENT", ["MANAGE_CONTENT"]],
  ])("is forbidden for a member holding %s", async (_label, claims) => {
    const { group, member, nonMember, creator } = await createAccessScenario();
    await grantClaims(member.id, group.id, claims);
    actAs(member.id);

    await expect(listGroupMembers(group.slug)).rejects.toThrow(FORBIDDEN);
    await expect(
      inviteMemberToGroup(null, formData({ groupSlug: group.slug, email: nonMember.email }))
    ).rejects.toThrow(FORBIDDEN);
    await expect(
      removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: creator.id }))
    ).rejects.toThrow(FORBIDDEN);

    expect(await isMember(nonMember.id, group.id)).toBe(false);
    expect(sentEmails()).toHaveLength(0);
  });
});

describe("removing the Creator", () => {
  it("fails when a MANAGE_MEMBERS holder tries it", async () => {
    const { group, creator, manager } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: creator.id }))
    ).rejects.toThrow("Gruppens administratör kan inte tas bort från gruppen");
    expect(await isMember(creator.id, group.id)).toBe(true);
  });

  it("fails when the Creator tries it on themselves", async () => {
    const { group, creator } = await createManagerScenario();
    actAs(creator.id);

    await expect(
      removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: creator.id }))
    ).rejects.toThrow("Du kan inte ta bort dig själv från gruppen");
    expect(await isMember(creator.id, group.id)).toBe(true);
  });
});

describe("removing a member who holds Claims", () => {
  it("drops their Claims along with the membership", async () => {
    const { group, creator, manager } = await createManagerScenario([
      "MANAGE_MEMBERS",
      "MANAGE_CONTENT",
    ]);
    actAs(creator.id);

    await removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: manager.id }));

    expect(await claimsOf(manager.id, group.id)).toEqual([]);
  });
});

describe("getGroups", () => {
  it.each<[string, GroupClaim[], boolean]>([
    ["MANAGE_MEMBERS", ["MANAGE_MEMBERS"], true],
    ["only MANAGE_CONTENT", ["MANAGE_CONTENT"], false],
    ["no Claim", [], false],
  ])("flags canManageMembers for a member holding %s", async (_label, claims, expected) => {
    const { group, member } = await createAccessScenario();
    await grantClaims(member.id, group.id, claims);
    actAs(member.id);

    const groups = await getGroups();

    expect(groups.find((g) => g.id === group.id)).toMatchObject({
      canManageGroup: false,
      canManageMembers: expected,
    });
  });

  it("flags the Creator as able to manage members", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);

    const groups = await getGroups();

    expect(groups.find((g) => g.id === group.id)).toMatchObject({
      canManageGroup: true,
      canManageMembers: true,
    });
  });

  it("does not let one group's MANAGE_MEMBERS leak into another group", async () => {
    const { group, member } = await createAccessScenario();
    await grantClaims(member.id, group.id, ["MANAGE_MEMBERS"]);
    const otherGroup = await createGroup();
    await testPrisma.usersToGroups.create({ data: { userId: member.id, groupId: otherGroup.id } });
    actAs(member.id);

    const groups = await getGroups();

    expect(groups.find((g) => g.id === otherGroup.id)).toMatchObject({
      canManageMembers: false,
    });
  });
});

describe("renaming and deleting the Group", () => {
  it("stays Creator-only: MANAGE_MEMBERS does not unlock either", async () => {
    const { group, manager } = await createManagerScenario(["MANAGE_MEMBERS", "MANAGE_CONTENT"]);
    actAs(manager.id);

    await expect(updateGroup(formData({ groupSlug: group.slug, name: "Nytt namn" }))).rejects.toThrow(
      "Du har inte behörighet att redigera den här gruppen"
    );
    await expect(deleteGroup(formData({ groupSlug: group.slug }))).rejects.toThrow(
      "Du har inte behörighet att ta bort den här gruppen"
    );

    const stored = await testPrisma.group.findUnique({ where: { id: group.id } });
    expect(stored?.name).toBe(group.name);
  });
});

describe("setMemberClaims", () => {
  it("lets the Creator grant both Claims and then clear them", async () => {
    const { group, creator, other } = await createManagerScenario();
    actAs(creator.id);

    await setMemberClaims(
      claimsFormData(group.slug, other.id, ["MANAGE_MEMBERS", "MANAGE_CONTENT"])
    );
    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_MEMBERS", "MANAGE_CONTENT"]);

    await setMemberClaims(claimsFormData(group.slug, other.id, []));
    expect(await claimsOf(other.id, group.id)).toEqual([]);
  });

  it("replaces the member's whole Claim set rather than adding to it", async () => {
    const { group, creator, other } = await createManagerScenario();
    await grantClaims(other.id, group.id, ["MANAGE_MEMBERS"]);
    actAs(creator.id);

    await setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_CONTENT"]));

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("lets a MANAGE_MEMBERS-only holder grant MANAGE_CONTENT they don't hold", async () => {
    const { group, manager, other } = await createManagerScenario(["MANAGE_MEMBERS"]);
    actAs(manager.id);

    await setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_CONTENT"]));

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("lets a MANAGE_MEMBERS holder revoke another member's MANAGE_MEMBERS", async () => {
    const { group, manager, other } = await createManagerScenario();
    await grantClaims(other.id, group.id, ["MANAGE_MEMBERS", "MANAGE_CONTENT"]);
    actAs(manager.id);

    await setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_CONTENT"]));

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("lets the last of two managers' saves win", async () => {
    const { group, creator, manager, other } = await createManagerScenario();

    actAs(manager.id);
    await setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_MEMBERS"]));
    actAs(creator.id);
    await setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_CONTENT"]));

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("never merges two concurrent saves: one of them wins outright", async () => {
    const { group, creator, other } = await createManagerScenario();
    actAs(creator.id);

    for (let round = 0; round < 10; round++) {
      await setMemberClaims(claimsFormData(group.slug, other.id, []));
      await Promise.all([
        setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_MEMBERS"])),
        setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_CONTENT"])),
      ]);

      expect([["MANAGE_MEMBERS"], ["MANAGE_CONTENT"]]).toContainEqual(
        await claimsOf(other.id, group.id)
      );
    }
  });

  it("is forbidden for a member holding only MANAGE_CONTENT", async () => {
    const { group, manager, other } = await createManagerScenario(["MANAGE_CONTENT"]);
    actAs(manager.id);

    await expect(
      setMemberClaims(claimsFormData(group.slug, other.id, ["MANAGE_MEMBERS"]))
    ).rejects.toThrow(FORBIDDEN);
    expect(await claimsOf(other.id, group.id)).toEqual([]);
  });

  it("rejects setting Claims on the Creator", async () => {
    const { group, creator, manager } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      setMemberClaims(claimsFormData(group.slug, creator.id, ["MANAGE_MEMBERS"]))
    ).rejects.toThrow("Gruppens administratör har alltid alla behörigheter");
    expect(await claimsOf(creator.id, group.id)).toEqual([]);
  });

  it("rejects a caller targeting their own Claims", async () => {
    const { group, manager } = await createManagerScenario();
    actAs(manager.id);

    await expect(setMemberClaims(claimsFormData(group.slug, manager.id, []))).rejects.toThrow(
      "Du kan inte ändra dina egna behörigheter"
    );
    expect(await claimsOf(manager.id, group.id)).toEqual(["MANAGE_MEMBERS"]);
  });

  it("rejects a target who is not a member of the group", async () => {
    const { group, creator, nonMember } = await createManagerScenario();
    actAs(creator.id);

    await expect(
      setMemberClaims(claimsFormData(group.slug, nonMember.id, ["MANAGE_CONTENT"]))
    ).rejects.toThrow("Medlemmen finns inte i gruppen");
  });

  it("rejects an unknown Claim without changing the member's Claims", async () => {
    const { group, creator, other } = await createManagerScenario();
    await grantClaims(other.id, group.id, ["MANAGE_CONTENT"]);
    actAs(creator.id);

    const fd = claimsFormData(group.slug, other.id, ["MANAGE_MEMBERS"]);
    fd.append("claims", "ADMIN");

    await expect(setMemberClaims(fd)).rejects.toThrow("Ogiltig behörighet");
    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });
});

describe("the Group's Invitations", () => {
  /** Manager scenario with a pending Invitation to anna@example.com, sent by the Creator. */
  async function createInvitationScenario(managerClaims: GroupClaim[] = ["MANAGE_MEMBERS"]) {
    const scenario = await createManagerScenario(managerClaims);
    await inviteToGroup(
      { groupId: scenario.group.id, email: "anna@example.com", invitedById: scenario.creator.id },
      new Date(Date.now() - 2 * 60 * 1000)
    );
    const token = emailedLinkToken(sentEmails().at(-1)!, INVITATION_PATH);
    const invitation = await testPrisma.invitation.findFirstOrThrow({ select: { id: true } });
    const invitationForm = formData({ groupSlug: scenario.group.slug, invitationId: invitation.id });
    resetFakeEmail();
    return { ...scenario, token, invitation, invitationForm };
  }

  it.each([
    ["a MANAGE_MEMBERS holder", "manager"],
    ["the Creator", "creator"],
  ] as const)("are listed for %s with address, sender and expiry", async (_label, viewer) => {
    const scenario = await createInvitationScenario();
    actAs(scenario[viewer].id);

    await expect(listGroupInvitations(scenario.group.slug)).resolves.toEqual([
      {
        id: scenario.invitation.id,
        email: "anna@example.com",
        senderName: scenario.creator.name,
        expiresAt: expect.any(Date),
        expired: false,
      },
    ]);
  });

  it("can be revoked, which makes the link no longer valid", async () => {
    const { manager, token, invitationForm } = await createInvitationScenario();
    actAs(manager.id);

    await revokeGroupInvitation(invitationForm);

    expect(await testPrisma.invitation.count()).toBe(0);
    await expect(getInvitationView(token, null)).resolves.toEqual({ state: "invalid" });
  });

  it("refuses to revoke an Invitation the Group doesn't have", async () => {
    const { group, manager } = await createInvitationScenario();
    actAs(manager.id);

    await expect(
      revokeGroupInvitation(formData({ groupSlug: group.slug, invitationId: "00000000-0000-0000-0000-000000000000" }))
    ).rejects.toThrow("Inbjudan hittades inte");
    expect(await testPrisma.invitation.count()).toBe(1);
  });

  it("can be re-sent, which emails a new link and makes the old one no longer valid", async () => {
    const { manager, token, invitationForm } = await createInvitationScenario();
    actAs(manager.id);

    await expect(resendGroupInvitation(invitationForm)).resolves.toEqual({
      ok: true,
      email: "anna@example.com",
    });

    expect(sentEmails().map((email) => email.to)).toEqual(["anna@example.com"]);
    await expect(getInvitationView(token, null)).resolves.toEqual({ state: "invalid" });
  });

  it("refuses a second re-send within a minute", async () => {
    const { manager, invitationForm } = await createInvitationScenario();
    actAs(manager.id);
    await resendGroupInvitation(invitationForm);

    await expect(resendGroupInvitation(invitationForm)).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/^Vänta \d+ sekunder innan du skickar inbjudan igen$/),
    });
    expect(sentEmails()).toHaveLength(1);
  });

  it("asks to try again when the re-sent email can't be sent", async () => {
    const { manager, invitationForm } = await createInvitationScenario();
    failEmailsTo("anna@example.com");
    actAs(manager.id);

    await expect(resendGroupInvitation(invitationForm)).resolves.toEqual({
      ok: false,
      error: "Kunde inte skicka inbjudan, försök igen",
    });
  });

  it.each<[string, GroupClaim[]]>([
    ["no Claim", []],
    ["only MANAGE_CONTENT", ["MANAGE_CONTENT"]],
  ])("are hidden from, and can't be changed by, a member holding %s", async (_label, claims) => {
    const { group, other, invitationForm } = await createInvitationScenario();
    await grantClaims(other.id, group.id, claims);
    actAs(other.id);

    await expect(listGroupInvitations(group.slug)).rejects.toThrow(FORBIDDEN);
    await expect(revokeGroupInvitation(invitationForm)).rejects.toThrow(FORBIDDEN);
    await expect(resendGroupInvitation(invitationForm)).rejects.toThrow(FORBIDDEN);

    expect(await testPrisma.invitation.count()).toBe(1);
    expect(sentEmails()).toHaveLength(0);
  });
});
