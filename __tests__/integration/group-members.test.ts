import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import type { GroupClaim } from "@/app/generated/prisma/client";
import { testPrisma } from "../support/db";
import { createAccessScenario, createUser, grantClaims } from "../support/fixtures";
import {
  addMemberToGroup,
  deleteGroup,
  grantMemberClaim,
  listGroupMembers,
  removeMemberFromGroup,
  revokeMemberClaim,
  updateGroup,
} from "@/app/actions/groups";

const mockAuth = vi.mocked(auth);

const FORBIDDEN = "Du har inte behörighet att hantera medlemmar i gruppen";

function actAs(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId } } as never);
}

function formData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

/** Access scenario plus a second plain member, and a manager holding the given Claims. */
async function createManagerScenario(managerClaims: GroupClaim[] = ["MANAGE_MEMBERS"]) {
  const scenario = await createAccessScenario();
  const { group, member: manager } = scenario;
  await grantClaims(manager.id, group.id, managerClaims);
  const other = await createUser();
  await testPrisma.usersToGroups.create({ data: { userId: other.id, groupId: group.id } });
  return { ...scenario, manager, other };
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
    ).rejects.toThrow("Gruppens skapare kan inte tas bort från gruppen");
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

describe("grantMemberClaim / revokeMemberClaim", () => {
  it.each<GroupClaim>(["MANAGE_MEMBERS", "MANAGE_CONTENT"])(
    "lets the Creator grant and revoke %s on a member",
    async (claim) => {
      const { group, creator, other } = await createManagerScenario();
      actAs(creator.id);

      await grantMemberClaim(formData({ groupSlug: group.slug, memberUserId: other.id, claim }));
      expect(await claimsOf(other.id, group.id)).toEqual([claim]);

      await revokeMemberClaim(formData({ groupSlug: group.slug, memberUserId: other.id, claim }));
      expect(await claimsOf(other.id, group.id)).toEqual([]);
    }
  );

  it("lets a MANAGE_MEMBERS-only holder grant MANAGE_CONTENT they don't hold", async () => {
    const { group, manager, other } = await createManagerScenario(["MANAGE_MEMBERS"]);
    actAs(manager.id);

    await grantMemberClaim(
      formData({ groupSlug: group.slug, memberUserId: other.id, claim: "MANAGE_CONTENT" })
    );

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("lets a MANAGE_MEMBERS holder revoke another member's MANAGE_MEMBERS", async () => {
    const { group, manager, other } = await createManagerScenario();
    await grantClaims(other.id, group.id, ["MANAGE_MEMBERS", "MANAGE_CONTENT"]);
    actAs(manager.id);

    await revokeMemberClaim(
      formData({ groupSlug: group.slug, memberUserId: other.id, claim: "MANAGE_MEMBERS" })
    );

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("is idempotent: granting a held Claim or revoking an absent one succeeds", async () => {
    const { group, creator, other } = await createManagerScenario();
    await grantClaims(other.id, group.id, ["MANAGE_CONTENT"]);
    actAs(creator.id);

    await grantMemberClaim(
      formData({ groupSlug: group.slug, memberUserId: other.id, claim: "MANAGE_CONTENT" })
    );
    await revokeMemberClaim(
      formData({ groupSlug: group.slug, memberUserId: other.id, claim: "MANAGE_MEMBERS" })
    );

    expect(await claimsOf(other.id, group.id)).toEqual(["MANAGE_CONTENT"]);
  });

  it("is forbidden for a member holding only MANAGE_CONTENT", async () => {
    const { group, manager, other } = await createManagerScenario(["MANAGE_CONTENT"]);
    actAs(manager.id);

    await expect(
      grantMemberClaim(
        formData({ groupSlug: group.slug, memberUserId: other.id, claim: "MANAGE_MEMBERS" })
      )
    ).rejects.toThrow(FORBIDDEN);
    expect(await claimsOf(other.id, group.id)).toEqual([]);
  });

  it.each([
    ["grant", grantMemberClaim],
    ["revoke", revokeMemberClaim],
  ] as const)("rejects an attempt to %s a Claim on the Creator", async (_label, action) => {
    const { group, creator, manager } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      action(formData({ groupSlug: group.slug, memberUserId: creator.id, claim: "MANAGE_MEMBERS" }))
    ).rejects.toThrow("Gruppens skapare har alltid alla behörigheter");
    expect(await claimsOf(creator.id, group.id)).toEqual([]);
  });

  it("rejects a caller targeting their own Claims", async () => {
    const { group, manager } = await createManagerScenario();
    actAs(manager.id);

    await expect(
      grantMemberClaim(
        formData({ groupSlug: group.slug, memberUserId: manager.id, claim: "MANAGE_CONTENT" })
      )
    ).rejects.toThrow("Du kan inte ändra dina egna behörigheter");
    expect(await claimsOf(manager.id, group.id)).toEqual(["MANAGE_MEMBERS"]);
  });

  it("rejects a target who is not a member of the group", async () => {
    const { group, creator, nonMember } = await createManagerScenario();
    actAs(creator.id);

    await expect(
      grantMemberClaim(
        formData({ groupSlug: group.slug, memberUserId: nonMember.id, claim: "MANAGE_CONTENT" })
      )
    ).rejects.toThrow("Medlemmen finns inte i gruppen");
  });
});
