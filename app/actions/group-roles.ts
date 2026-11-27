"use server";

import { Prisma } from "@/app/generated/prisma/client";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { compareCaseInsensitive } from "@/lib/data-table/sorting";
import { changeMemberRoles, changeRole, requireGroupAccess } from "@/lib/group-access";
import { runGroupMutation } from "@/lib/tenant-group";
import { matchKey } from "@/lib/text/match-key";
import {
  parseGroupClaimsFromFormData,
  parseGroupSlugFromFormData,
  parseMemberUserIdFromFormData,
  parseRoleIdFromFormData,
  parseRoleIdsFromFormData,
  parseRoleNameFromFormData,
} from "@/lib/schemas/groups";
import { revalidateGroupMembersRoutes } from "@/lib/revalidate/group-routes";

const ROLE_NOT_FOUND = "Rollen hittades inte";
const ROLE_NAME_TAKEN = "Det finns redan en roll med det namnet";

/** One of the Group's Roles as the members page lists it. */
export type GroupRoleRow = {
  id: string;
  name: string;
  claims: GroupClaim[];
  /** How many Members hold the Role. */
  holderCount: number;
  /** Whether the viewer may rename, change the Claims of or delete it. */
  canChange: boolean;
};

/** The Group's Roles by name, for anyone who may open the members page. */
export async function listGroupRoles(groupSlug: string): Promise<GroupRoleRow[]> {
  const access = await requireGroupAccess(groupSlug);
  access.require("viewMembers");

  const roles = await prisma.groupRole.findMany({
    where: { groupId: access.group.id },
    select: {
      id: true,
      name: true,
      claims: { select: { claim: true }, orderBy: { claim: "asc" } },
      _count: { select: { holders: true } },
    },
  });

  return roles
    .map((role) => ({
      id: role.id,
      name: role.name,
      claims: role.claims.map(({ claim }) => claim),
      holderCount: role._count.holders,
      canChange: access.can(changeRole(role.id)),
    }))
    .sort((a, b) => compareCaseInsensitive(a.name, b.name));
}

/** "Ny roll": a Role with a name and any set of Claims, held by nobody yet. */
export async function createGroupRole(formData: FormData): Promise<void> {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const name = parseRoleNameFromFormData(formData);
  const claims = parseGroupClaimsFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageRoles"),
    async ({ groupId }) => {
      await refuseTakenName(() =>
        prisma.groupRole.create({
          data: { groupId, name, nameKey: matchKey(name), claims: { create: claims.map((claim) => ({ claim })) } },
        }),
      );
      revalidateGroupMembersRoutes(groupSlug);
    },
  );
}

/**
 * Renames a Role and sets its complete Claim set. Every holder gains or loses
 * the Claims at once, since a Role is a live link.
 */
export async function updateGroupRole(formData: FormData): Promise<void> {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const roleId = parseRoleIdFromFormData(formData);
  const name = parseRoleNameFromFormData(formData);
  const claims = parseGroupClaimsFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require(changeRole(roleId)),
    async ({ groupId }) => {
      await refuseTakenName(() =>
        prisma.$transaction(async (tx) => {
          const updated = await tx.groupRole.updateMany({
            where: { id: roleId, groupId },
            data: { name, nameKey: matchKey(name) },
          });
          if (updated.count === 0) {
            throw new Error(ROLE_NOT_FOUND);
          }
          await tx.groupRoleClaim.deleteMany({ where: { roleId } });
          await tx.groupRoleClaim.createMany({ data: claims.map((claim) => ({ roleId, claim })) });
        }),
      );
      revalidateGroupMembersRoutes(groupSlug);
    },
  );
}

/** Deletes a Role, even while Members hold it: they lose the Claims they had only through it. */
export async function deleteGroupRole(formData: FormData): Promise<void> {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const roleId = parseRoleIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require(changeRole(roleId)),
    async ({ groupId }) => {
      const deleted = await prisma.groupRole.deleteMany({ where: { id: roleId, groupId } });
      if (deleted.count === 0) {
        throw new Error(ROLE_NOT_FOUND);
      }
      revalidateGroupMembersRoutes(groupSlug);
    },
  );
}

/**
 * Sets a Member's complete set of Roles in one transaction; concurrent saves resolve last-write-wins.
 * The caller must hold `MANAGE_MEMBER_AUTHORIZATION`, and may not target the Creator or themselves.
 */
export async function setMemberRoles(formData: FormData): Promise<void> {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const memberUserId = parseMemberUserIdFromFormData(formData);
  const roleIds = parseRoleIdsFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) =>
      access.require(changeMemberRoles(memberUserId), {
        targetIsCreator: "Gruppens administratör kan inte få roller",
        targetIsSelf: "Du kan inte ändra dina egna roller",
      }),
    async ({ groupId }) => {
      await prisma.$transaction(async (tx) => {
        // As in setMemberClaims: the lock queues concurrent saves for this Member and proves membership.
        const membership = await tx.$queryRaw<unknown[]>`
          SELECT 1 FROM users_to_groups
          WHERE user_id = ${memberUserId} AND group_id = ${groupId}
          FOR UPDATE
        `;
        if (membership.length === 0) {
          throw new Error("Medlemmen finns inte i gruppen");
        }
        const known = await tx.groupRole.count({ where: { id: { in: roleIds }, groupId } });
        if (known !== roleIds.length) {
          throw new Error(ROLE_NOT_FOUND);
        }

        await tx.groupMemberRole.deleteMany({ where: { userId: memberUserId, groupId } });
        await tx.groupMemberRole.createMany({
          data: roleIds.map((roleId) => ({ userId: memberUserId, groupId, roleId })),
        });
      });

      revalidateGroupMembersRoutes(groupSlug);
    },
  );
}

/** Runs a write that sets a Role's name, telling the user when another Role in the Group has it. */
async function refuseTakenName(write: () => Promise<unknown>): Promise<void> {
  try {
    await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(ROLE_NAME_TAKEN);
    }
    throw error;
  }
}
