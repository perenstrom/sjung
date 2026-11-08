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
import {
  addMemberToGroup,
  deleteGroup,
  getGroups,
  listGroupMembers,
  removeMemberFromGroup,
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

  it("invites an existing user by email", async () => {
    const { group, manager, nonMember } = await createManagerScenario();
    actAs(manager.id);

    await addMemberToGroup(formData({ groupSlug: group.slug, email: nonMember.email }));

    expect(await isMember(nonMember.id, group.id)).toBe(true);
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
      addMemberToGroup(formData({ groupSlug: group.slug, email: nonMember.email }))
    ).rejects.toThrow(FORBIDDEN);
    await expect(
      removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: creator.id }))
    ).rejects.toThrow(FORBIDDEN);

    expect(await isMember(nonMember.id, group.id)).toBe(false);
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
      isCreator: false,
      canManageMembers: expected,
    });
  });

  it("flags the Creator as able to manage members", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);

    const groups = await getGroups();

    expect(groups.find((g) => g.id === group.id)).toMatchObject({
      isCreator: true,
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

    await expect(updateGroup(formData({ id: group.id, name: "Nytt namn" }))).rejects.toThrow(
      "Du har inte behörighet att redigera den här gruppen"
    );
    await expect(deleteGroup(formData({ id: group.id }))).rejects.toThrow(
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
