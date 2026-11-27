import { cache } from "react";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth/require-user";
import prisma from "@/lib/prisma";
import {
  groupAccessDenial,
  type GroupAccessDenial,
  type GroupAccessFacts,
  type GroupCapability,
} from "@/lib/group-access-policy";

export {
  changeMemberClaims,
  changeMemberRoles,
  changeRole,
  removeMember,
  type GroupCapability,
} from "@/lib/group-access-policy";
export type { GroupAccessDenial } from "@/lib/group-access-policy";

/** Per-refusal wording that replaces the default message from `require`. */
export type GroupAccessMessages = Partial<Record<GroupAccessDenial, string>>;

/** What the signed-in User may do in one Group they are a Member of. */
export type GroupAccess = {
  userId: string;
  group: { id: string; slug: string; name: string };
  can(capability: GroupCapability): boolean;
  /** Throws a Swedish message naming why the capability is refused. */
  require(capability: GroupCapability, messages?: GroupAccessMessages): void;
};

const NOT_A_MEMBER = "Ogiltig grupp eller saknad behörighet";

const DEFAULT_MESSAGES: Record<GroupAccessDenial, string> = {
  lacksManageMembers: "Du har inte behörighet att hantera medlemmar i gruppen",
  lacksManageMemberAuthorization: "Du har inte behörighet att ändra behörigheter i gruppen",
  lacksManageGroup: "Du har inte behörighet att hantera gruppen",
  lacksManageContent: "Du har inte behörighet att ändra innehåll i gruppen",
  lacksReorderSetLists: "Du har inte behörighet att ändra ordning i gruppens repertoarer",
  lacksManageRunningOrderNotes: "Du har inte behörighet att hantera anteckningar i gruppens repertoarer",
  lacksManageGroupHome: "Du har inte behörighet att ändra gruppens startsida",
  targetIsSelf: "Du kan inte ändra ditt eget medlemskap",
  targetIsCreator: "Gruppens administratör kan inte ändras",
  roleIsHeld: "Du kan inte ändra en roll som du själv har",
};

function accessSelect(userId: string) {
  return {
    id: true,
    slug: true,
    name: true,
    createdById: true,
    users: {
      where: { userId },
      select: {
        claims: { select: { claim: true } },
        roles: { select: { roleId: true, role: { select: { claims: { select: { claim: true } } } } } },
      },
    },
  } satisfies Prisma.GroupSelect;
}

type LoadedGroup = Prisma.GroupGetPayload<{ select: ReturnType<typeof accessSelect> }>;

function toGroupAccess(userId: string, loaded: LoadedGroup): GroupAccess {
  const facts: GroupAccessFacts = {
    userId,
    creatorId: loaded.createdById,
    // A Role is a live link: its Claims count for as long as the Member holds it.
    claims: loaded.users.flatMap((membership) => [
      ...membership.claims.map(({ claim }) => claim),
      ...membership.roles.flatMap(({ role }) => role.claims.map(({ claim }) => claim)),
    ]),
    roleIds: loaded.users.flatMap((membership) => membership.roles.map(({ roleId }) => roleId)),
  };

  return {
    userId,
    group: { id: loaded.id, slug: loaded.slug, name: loaded.name },
    can: (capability) => groupAccessDenial(facts, capability) === null,
    require: (capability, messages) => {
      const denial = groupAccessDenial(facts, capability);
      if (denial !== null) {
        throw new Error(messages?.[denial] ?? DEFAULT_MESSAGES[denial]);
      }
    },
  };
}

/**
 * The signed-in User's access in the Group with this slug, or `null` when they
 * aren't a Member of it. Loaded once per request.
 */
export const findGroupAccess = cache(async (groupSlug: string): Promise<GroupAccess | null> => {
  const user = await requireUser();
  const loaded = await prisma.group.findFirst({
    where: { slug: groupSlug, users: { some: { userId: user.id } } },
    select: accessSelect(user.id),
  });
  return loaded ? toGroupAccess(user.id, loaded) : null;
});

/** {@link findGroupAccess} for server actions: throws when the User isn't a Member. */
export async function requireGroupAccess(groupSlug: string): Promise<GroupAccess> {
  const access = await findGroupAccess(groupSlug);
  if (!access) {
    throw new Error(NOT_A_MEMBER);
  }
  return access;
}

/** The signed-in User's access in each Group they are a Member of, by Group name. */
export async function listGroupAccess(): Promise<GroupAccess[]> {
  const user = await requireUser();
  const groups = await prisma.group.findMany({
    where: { users: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    select: accessSelect(user.id),
  });
  return groups.map((loaded) => toGroupAccess(user.id, loaded));
}
