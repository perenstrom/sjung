import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { GroupClaim, GroupRole } from "@/app/generated/prisma/client";
import { testPrisma } from "../support/db";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";
import {
  createAccessScenario,
  createGroup,
  createMember,
  createRole,
  giveRoles,
  grantClaims,
} from "../support/fixtures";
import { findGroupAccess } from "@/lib/group-access";
import {
  createGroupRole,
  deleteGroupRole,
  listGroupRoles,
  setMemberRoles,
  updateGroupRole,
} from "@/app/actions/group-roles";
import { listGroupMembers, removeMemberFromGroup, setMemberClaims } from "@/app/actions/groups";

const FORBIDDEN = "Du har inte behörighet att ändra behörigheter i gruppen";

/** A Group with its Creator, a MANAGE_MEMBER_AUTHORIZATION holder and a plain Member to act on. */
async function createRoleScenario() {
  const { group, creator, member: target } = await createAccessScenario();
  const authorizer = await createMember(group, ["MANAGE_MEMBER_AUTHORIZATION"]);
  return { group, creator, target, authorizer };
}

function roleFormData(groupSlug: string, fields: { roleId?: string; name?: string; claims?: GroupClaim[] }): FormData {
  const fd = formData({ groupSlug, ...(fields.roleId ? { roleId: fields.roleId } : {}), name: fields.name ?? "" });
  for (const claim of fields.claims ?? []) {
    fd.append("claims", claim);
  }
  return fd;
}

function memberRolesFormData(groupSlug: string, memberUserId: string, roles: GroupRole[]): FormData {
  const fd = formData({ groupSlug, memberUserId });
  for (const role of roles) {
    fd.append("roleIds", role.id);
  }
  return fd;
}

async function canManageContent(userId: string, groupSlug: string) {
  actAs(userId);
  const access = await findGroupAccess(groupSlug);
  return access?.can("manageContent") ?? false;
}

async function rolesInGroup(groupId: string) {
  const roles = await testPrisma.groupRole.findMany({
    where: { groupId },
    select: { name: true, claims: { select: { claim: true }, orderBy: { claim: "asc" } } },
    orderBy: { nameKey: "asc" },
  });
  return roles.map((role) => ({ name: role.name, claims: role.claims.map(({ claim }) => claim) }));
}

async function roleIdsOf(userId: string, groupId: string) {
  const rows = await testPrisma.groupMemberRole.findMany({ where: { userId, groupId }, select: { roleId: true } });
  return rows.map((row) => row.roleId).sort();
}

describe("a Role's Claims count for every holder, for as long as they hold it", () => {
  it("grants a Claim added to the Role and takes back one removed from it", async () => {
    const { group, creator, target } = await createRoleScenario();
    const role = await createRole(group, "Notansvarig");
    await giveRoles(target.id, [role]);
    expect(await canManageContent(target.id, group.slug)).toBe(false);

    actAs(creator.id);
    await updateGroupRole(roleFormData(group.slug, { roleId: role.id, name: role.name, claims: ["MANAGE_CONTENT"] }));
    expect(await canManageContent(target.id, group.slug)).toBe(true);

    actAs(creator.id);
    await updateGroupRole(roleFormData(group.slug, { roleId: role.id, name: role.name, claims: [] }));
    expect(await canManageContent(target.id, group.slug)).toBe(false);
  });

  it.each<[string, "individual Claim" | "Role" | "other Role"]>([
    ["revoking the individual Claim leaves the Role's", "individual Claim"],
    ["taking the Role leaves the individual Claim", "Role"],
    ["removing the Claim from the Role leaves another Role's", "other Role"],
  ])("holding a Claim individually and through Roles is independent: %s", async (_label, removed) => {
    const { group, creator, target } = await createRoleScenario();
    const role = await createRole(group, "Notansvarig", ["MANAGE_CONTENT"]);
    const otherRole = await createRole(group, "Repertoaransvarig", ["MANAGE_CONTENT"]);
    await grantClaims(target.id, group.id, ["MANAGE_CONTENT"]);
    await giveRoles(target.id, [role, otherRole]);
    actAs(creator.id);

    if (removed === "individual Claim") {
      await setMemberClaims(formData({ groupSlug: group.slug, memberUserId: target.id }));
    } else if (removed === "Role") {
      await setMemberRoles(memberRolesFormData(group.slug, target.id, [otherRole]));
    } else {
      await testPrisma.groupMemberClaim.deleteMany({ where: { userId: target.id } });
      await updateGroupRole(roleFormData(group.slug, { roleId: role.id, name: role.name, claims: [] }));
    }

    expect(await canManageContent(target.id, group.slug)).toBe(true);
  });

  it("takes a deleted Role's Claims from holders who had them only through it", async () => {
    const { group, creator, target } = await createRoleScenario();
    const role = await createRole(group, "Notansvarig", ["MANAGE_CONTENT"]);
    await giveRoles(target.id, [role]);
    actAs(creator.id);

    await deleteGroupRole(formData({ groupSlug: group.slug, roleId: role.id }));

    expect(await canManageContent(target.id, group.slug)).toBe(false);
    expect(await rolesInGroup(group.id)).toEqual([]);
  });
});

describe("defining Roles", () => {
  it.each<[string, GroupClaim[] | "creator", boolean]>([
    ["the Creator", "creator", true],
    ["MANAGE_MEMBER_AUTHORIZATION", ["MANAGE_MEMBER_AUTHORIZATION"], true],
    ["MANAGE_MEMBERS", ["MANAGE_MEMBERS"], false],
    ["no Claims", [], false],
  ])("is open to a viewer holding %s, for create, update and delete alike", async (_label, kind, allowed) => {
    const { group, creator } = await createRoleScenario();
    const viewer = kind === "creator" ? creator : await createMember(group, kind);
    const existing = await createRole(group, "Stämledare", ["MANAGE_CONTENT"]);
    actAs(viewer.id);

    const attempts = [
      createGroupRole(roleFormData(group.slug, { name: "Notansvarig", claims: ["MANAGE_MEMBER_AUTHORIZATION"] })),
      updateGroupRole(roleFormData(group.slug, { roleId: existing.id, name: "Stämledare", claims: [] })),
    ];
    for (const attempt of attempts) {
      if (allowed) {
        await expect(attempt).resolves.toBeUndefined();
      } else {
        await expect(attempt).rejects.toThrow(FORBIDDEN);
      }
    }
    const deleting = deleteGroupRole(formData({ groupSlug: group.slug, roleId: existing.id }));
    if (allowed) {
      await expect(deleting).resolves.toBeUndefined();
      expect(await rolesInGroup(group.id)).toEqual([{ name: "Notansvarig", claims: ["MANAGE_MEMBER_AUTHORIZATION"] }]);
    } else {
      await expect(deleting).rejects.toThrow(FORBIDDEN);
      expect(await rolesInGroup(group.id)).toEqual([{ name: "Stämledare", claims: ["MANAGE_CONTENT"] }]);
    }
  });

  it("refuses a name another Role in the Group has up to case and spacing, but allows it in another Group", async () => {
    const { group, creator } = await createRoleScenario();
    await createRole(group, "Stämledare");
    const notansvarig = await createRole(group, "Notansvarig");
    const otherGroup = await createGroup({ createdById: creator.id, updatedById: creator.id });
    actAs(creator.id);

    const taken = "Det finns redan en roll med det namnet";
    await expect(createGroupRole(roleFormData(group.slug, { name: "  stämledare " }))).rejects.toThrow(taken);
    await expect(
      updateGroupRole(roleFormData(group.slug, { roleId: notansvarig.id, name: "STÄMLEDARE" })),
    ).rejects.toThrow(taken);
    // Renaming a Role to a respelling of its own name is fine.
    await updateGroupRole(roleFormData(group.slug, { roleId: notansvarig.id, name: "notansvarig" }));
    await createGroupRole(roleFormData(otherGroup.slug, { name: "Stämledare" }));

    expect((await rolesInGroup(group.id)).map((role) => role.name)).toEqual(["notansvarig", "Stämledare"]);
    expect((await rolesInGroup(otherGroup.id)).map((role) => role.name)).toEqual(["Stämledare"]);
  });

  it("refuses changing or deleting a Role the viewer holds", async () => {
    const { group, authorizer } = await createRoleScenario();
    const role = await createRole(group, "Stämledare", ["MANAGE_CONTENT"]);
    await giveRoles(authorizer.id, [role]);
    actAs(authorizer.id);

    const held = "Du kan inte ändra en roll som du själv har";
    await expect(
      updateGroupRole(roleFormData(group.slug, { roleId: role.id, name: "Stämledare", claims: ["MANAGE_MEMBERS"] })),
    ).rejects.toThrow(held);
    await expect(deleteGroupRole(formData({ groupSlug: group.slug, roleId: role.id }))).rejects.toThrow(held);
    expect(await rolesInGroup(group.id)).toEqual([{ name: "Stämledare", claims: ["MANAGE_CONTENT"] }]);
  });

  it("refuses a Role from another Group", async () => {
    const { group, creator } = await createRoleScenario();
    const foreign = await createRole(await createGroup(), "Stämledare");
    actAs(creator.id);

    await expect(deleteGroupRole(formData({ groupSlug: group.slug, roleId: foreign.id }))).rejects.toThrow(
      "Rollen hittades inte",
    );
    expect(await testPrisma.groupRole.count()).toBe(1);
  });
});

describe("listGroupRoles", () => {
  it("lists each Role with its Claims and holder count, and whether the viewer may change it", async () => {
    const { group, target, authorizer } = await createRoleScenario();
    const stamledare = await createRole(group, "Stämledare", ["REORDER_SET_LISTS", "MANAGE_CONTENT"]);
    const notansvarig = await createRole(group, "Notansvarig");
    await giveRoles(target.id, [stamledare]);
    await giveRoles(authorizer.id, [stamledare]);
    const membersOnly = await createMember(group, ["MANAGE_MEMBERS"]);

    actAs(authorizer.id);
    expect(await listGroupRoles(group.slug)).toEqual([
      { id: notansvarig.id, name: "Notansvarig", claims: [], holderCount: 0, canChange: true },
      {
        id: stamledare.id,
        name: "Stämledare",
        claims: ["MANAGE_CONTENT", "REORDER_SET_LISTS"],
        holderCount: 2,
        canChange: false,
      },
    ]);

    // MANAGE_MEMBERS opens the members page, so sees the Roles but may change none.
    actAs(membersOnly.id);
    expect((await listGroupRoles(group.slug)).map((role) => role.canChange)).toEqual([false, false]);
  });
});

describe("setMemberRoles", () => {
  it("replaces the Member's whole set of Roles, and listGroupMembers shows it", async () => {
    const { group, target, authorizer } = await createRoleScenario();
    const [a, b, c] = await Promise.all(["A", "B", "C"].map((name) => createRole(group, name)));
    await giveRoles(target.id, [a, b]);
    actAs(authorizer.id);

    await setMemberRoles(memberRolesFormData(group.slug, target.id, [b, c]));

    expect(await roleIdsOf(target.id, group.id)).toEqual([b.id, c.id].sort());
    const listed = (await listGroupMembers(group.slug)).find((member) => member.id === target.id);
    expect(listed).toMatchObject({ canChangeRoles: true });
    expect([...(listed?.roleIds ?? [])].sort()).toEqual([b.id, c.id].sort());
  });

  it.each<[string, "self" | "Creator" | "MANAGE_MEMBERS", string]>([
    ["themselves", "self", "Du kan inte ändra dina egna roller"],
    ["the Creator", "Creator", "Gruppens administratör kan inte få roller"],
    ["anyone, holding only MANAGE_MEMBERS", "MANAGE_MEMBERS", FORBIDDEN],
  ])("refuses a viewer giving Roles to %s", async (_label, kind, message) => {
    const { group, creator, target, authorizer } = await createRoleScenario();
    const role = await createRole(group, "Stämledare");
    const viewer = kind === "MANAGE_MEMBERS" ? await createMember(group, ["MANAGE_MEMBERS"]) : authorizer;
    const memberUserId = { self: authorizer.id, Creator: creator.id, MANAGE_MEMBERS: target.id }[kind];
    actAs(viewer.id);

    await expect(setMemberRoles(memberRolesFormData(group.slug, memberUserId, [role]))).rejects.toThrow(message);
    expect(await testPrisma.groupMemberRole.count()).toBe(0);
  });

  it("refuses a Role from another Group", async () => {
    const { group, target, authorizer } = await createRoleScenario();
    const foreign = await createRole(await createGroup(), "Stämledare");
    actAs(authorizer.id);

    await expect(setMemberRoles(memberRolesFormData(group.slug, target.id, [foreign]))).rejects.toThrow(
      "Rollen hittades inte",
    );
    expect(await testPrisma.groupMemberRole.count()).toBe(0);
  });

  it("drops a removed Member's Roles along with the membership", async () => {
    const { group, creator, target } = await createRoleScenario();
    await giveRoles(target.id, [await createRole(group, "Stämledare")]);
    actAs(creator.id);

    await removeMemberFromGroup(formData({ groupSlug: group.slug, memberUserId: target.id }));

    expect(await roleIdsOf(target.id, group.id)).toEqual([]);
  });
});
