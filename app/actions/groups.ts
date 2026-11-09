"use server";

import { GroupClaim } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { isReservedGroupSlug, slugifyGroupName } from "@/lib/group-slug";
import { requireCreatorGroupById, requireMemberManagerGroupBySlug } from "@/lib/actions/guards";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";
import { setActiveGroupSlugCookie } from "@/lib/active-group-cookie";
import { inviteToGroup, type InviteToGroupResult } from "@/lib/invitations/invitations";
import {
  inviteEmailSchema,
  parseGroupClaimsFromFormData,
  parseGroupIdFromFormData,
  parseGroupNameFromFormData,
  parseMemberUserIdFromFormData,
  parseMembershipGroupSlugFromFormData,
} from "@/lib/schemas/groups";
import {
  revalidateAppAndMyGroupsRoutes,
  revalidateAppAndMyGroupsWithGroupRoute,
  revalidateGroupMembersRoutes,
} from "@/lib/revalidate/group-routes";

export async function getGroups() {
  const user = await requireUser();
  const groups = await prisma.group.findMany({
    where: {
      users: {
        some: { userId: user.id },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdById: true,
      users: {
        where: { userId: user.id },
        select: {
          claims: { select: { claim: true } },
        },
      },
    },
  });

  return groups.map((g) => {
    const isCreator = g.createdById === user.id;
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      isCreator,
      canManageMembers:
        isCreator ||
        g.users.some((membership) =>
          membership.claims.some(({ claim }) => claim === GroupClaim.MANAGE_MEMBERS)
        ),
    };
  });
}

export async function setActiveGroup(groupSlug: string) {
  const slug = groupSlug.trim();
  if (!slug) {
    throw new Error("Ogiltig grupp");
  }

  await getWritableGroupIdForSlug(slug);
  await setActiveGroupSlugCookie(slug);
}

export async function createGroup(formData: FormData) {
  const user = await requireUser();
  const trimmed = parseGroupNameFromFormData(formData);
  const base = slugifyGroupName(trimmed);
  if (isReservedGroupSlug(base)) {
    throw new Error(
      "Det namnet ger en förbjuden adress. Välj ett annat gruppnamn."
    );
  }

  let assignedSlug: string | null = null;

  await prisma.$transaction(async (tx) => {
    let n = 0;
    while (true) {
      const slug = n === 0 ? base : `${base}-${n + 1}`;
      if (isReservedGroupSlug(slug)) {
        n += 1;
        continue;
      }
      const clash = await tx.group.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (clash) {
        n += 1;
        continue;
      }

      const group = await tx.group.create({
        data: {
          name: trimmed,
          slug,
          createdById: user.id,
          updatedById: user.id,
        },
      });
      await tx.usersToGroups.create({
        data: {
          userId: user.id,
          groupId: group.id,
        },
      });
      assignedSlug = slug;
      break;
    }
  });

  if (assignedSlug) {
    revalidateAppAndMyGroupsWithGroupRoute(assignedSlug);
    return;
  }
  revalidateAppAndMyGroupsRoutes();
}

export async function updateGroup(formData: FormData) {
  const user = await requireUser();
  const id = parseGroupIdFromFormData(formData);
  const name = parseGroupNameFromFormData(formData);

  const existing = await requireCreatorGroupById(id, user.id, {
    forbiddenMessage: "Du har inte behörighet att redigera den här gruppen",
    select: { slug: true },
  });

  await prisma.group.update({
    where: { id },
    data: {
      name,
      updatedById: user.id,
    },
  });

  if (existing.slug) {
    revalidateAppAndMyGroupsWithGroupRoute(existing.slug);
    return;
  }
  revalidateAppAndMyGroupsRoutes();
}

export async function deleteGroup(formData: FormData) {
  const user = await requireUser();
  const id = parseGroupIdFromFormData(formData);

  const existing = await requireCreatorGroupById(id, user.id, {
    forbiddenMessage: "Du har inte behörighet att ta bort den här gruppen",
    select: { slug: true },
  });

  await prisma.group.delete({
    where: { id },
  });

  if (existing.slug) {
    revalidateAppAndMyGroupsWithGroupRoute(existing.slug);
    return;
  }
  revalidateAppAndMyGroupsRoutes();
}

export async function listGroupMembers(groupSlug: string) {
  const { groupId, creatorId } = await requireMemberManagerGroupBySlug(groupSlug);

  const rows = await prisma.usersToGroups.findMany({
    where: { groupId },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      claims: {
        select: { claim: true },
        orderBy: { claim: "asc" },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return rows.map((row) => ({
    ...row.user,
    isCreator: row.user.id === creatorId,
    claims: row.claims.map(({ claim }) => claim),
  }));
}

/** `useActionState` state for the members page's "Bjud in" form. */
export type InviteMemberState =
  | { status: "sent"; email: string }
  | { status: "error"; error: string; values: { email: string } }
  | null;

/**
 * "Bjud in": creates an Invitation for the address, or re-sends the pending
 * one, and emails it. Nobody joins until they accept. The answer doesn't
 * reveal whether the address has a Sjung account.
 */
export async function inviteMemberToGroup(
  _prevState: InviteMemberState,
  formData: FormData
): Promise<InviteMemberState> {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const { userId, groupId } = await requireMemberManagerGroupBySlug(groupSlug);

  const emailRaw = formData.get("email");
  const typed = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const parsed = inviteEmailSchema.safeParse(typed);
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Ange en giltig e-postadress";
    return { status: "error", error, values: { email: typed } };
  }
  const email = parsed.data;

  const result = await inviteToGroup({ groupId, email, invitedById: userId });
  if (result.status === "sent") {
    return { status: "sent", email };
  }
  return { status: "error", error: inviteFailureMessage(result), values: { email } };
}

/** What to tell the inviter when an Invitation couldn't be sent. */
function inviteFailureMessage(result: Exclude<InviteToGroupResult, { status: "sent" }>): string {
  switch (result.status) {
    case "already-member":
      return "Användaren är redan medlem i gruppen";
    case "cooldown":
      return `Vänta ${result.retryAfterSeconds} sekunder innan du skickar inbjudan igen`;
    case "send-failed":
      return "Kunde inte skicka inbjudan, försök igen";
  }
}

export async function removeMemberFromGroup(formData: FormData) {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const memberUserId = parseMemberUserIdFromFormData(formData);

  const { userId, groupId, creatorId } = await requireMemberManagerGroupBySlug(groupSlug);
  if (memberUserId === userId) {
    throw new Error("Du kan inte ta bort dig själv från gruppen");
  }
  if (memberUserId === creatorId) {
    throw new Error("Gruppens administratör kan inte tas bort från gruppen");
  }

  await requireGroupMembership(memberUserId, groupId);

  const memberCount = await prisma.usersToGroups.count({
    where: { groupId },
  });
  if (memberCount <= 1) {
    throw new Error("Kan inte ta bort sista medlemmen i gruppen");
  }

  await prisma.usersToGroups.delete({
    where: {
      userId_groupId: {
        userId: memberUserId,
        groupId,
      },
    },
  });

  revalidateGroupMembersRoutes(groupSlug);
}

/**
 * Sets a Member's complete Claim set in one transaction; concurrent saves resolve last-write-wins.
 * The caller must manage members, and may not target the Creator or themselves.
 */
export async function setMemberClaims(formData: FormData) {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const memberUserId = parseMemberUserIdFromFormData(formData);
  const claims = parseGroupClaimsFromFormData(formData);

  const { userId, groupId, creatorId } = await requireMemberManagerGroupBySlug(groupSlug);
  // Creator status implies every Claim and is never stored as a Claim row.
  if (memberUserId === creatorId) {
    throw new Error("Gruppens administratör har alltid alla behörigheter");
  }
  if (memberUserId === userId) {
    throw new Error("Du kan inte ändra dina egna behörigheter");
  }

  await prisma.$transaction(async (tx) => {
    // Locking the membership row queues concurrent saves for this Member, so the
    // last one replaces the set instead of merging with it. It also proves membership.
    const membership = await tx.$queryRaw<unknown[]>`
      SELECT 1 FROM users_to_groups
      WHERE user_id = ${memberUserId} AND group_id = ${groupId}
      FOR UPDATE
    `;
    if (membership.length === 0) {
      throw new Error("Medlemmen finns inte i gruppen");
    }

    await tx.groupMemberClaim.deleteMany({
      where: { userId: memberUserId, groupId },
    });
    await tx.groupMemberClaim.createMany({
      data: claims.map((claim) => ({ userId: memberUserId, groupId, claim })),
    });
  });

  revalidateGroupMembersRoutes(groupSlug);
}

async function requireGroupMembership(memberUserId: string, groupId: string) {
  const membership = await prisma.usersToGroups.findUnique({
    where: {
      userId_groupId: {
        userId: memberUserId,
        groupId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    throw new Error("Medlemmen finns inte i gruppen");
  }
}
