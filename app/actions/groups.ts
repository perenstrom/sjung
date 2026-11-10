"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { isReservedGroupSlug, slugifyGroupName } from "@/lib/group-slug";
import { changeMember, listGroupAccess, requireGroupAccess } from "@/lib/group-access";
import { getWritableGroupIdForSlug, runGroupMutation } from "@/lib/tenant-group";
import { setActiveGroupSlugCookie } from "@/lib/active-group-cookie";
import {
  findGroupInvitations,
  inviteToGroup,
  resendInvitation,
  revokeInvitation,
  type InviteToGroupResult,
} from "@/lib/invitations/invitations";
import {
  inviteEmailSchema,
  parseGroupClaimsFromFormData,
  parseGroupNameFromFormData,
  parseInvitationIdFromFormData,
  parseMemberUserIdFromFormData,
  parseMembershipGroupSlugFromFormData,
} from "@/lib/schemas/groups";
import {
  revalidateAppAndMyGroupsRoutes,
  revalidateAppAndMyGroupsWithGroupRoute,
  revalidateGroupMembersRoutes,
} from "@/lib/revalidate/group-routes";

/** The viewer's Groups by name, with what they may do in each. */
export async function getGroups() {
  const groups = await listGroupAccess();
  return groups.map((access) => ({
    ...access.group,
    canManageMembers: access.can("manageMembers"),
    canManageGroup: access.can("manageGroup"),
  }));
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
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const name = parseGroupNameFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) =>
      access.require("manageGroup", {
        lacksManageGroup: "Du har inte behörighet att redigera den här gruppen",
      }),
    async ({ userId, groupId }) => {
      await prisma.group.update({
        where: { id: groupId },
        data: {
          name,
          updatedById: userId,
        },
      });
      revalidateAppAndMyGroupsWithGroupRoute(groupSlug);
    }
  );
}

export async function deleteGroup(formData: FormData) {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) =>
      access.require("manageGroup", {
        lacksManageGroup: "Du har inte behörighet att ta bort den här gruppen",
      }),
    async ({ groupId }) => {
      await prisma.group.delete({
        where: { id: groupId },
      });
      revalidateAppAndMyGroupsWithGroupRoute(groupSlug);
    }
  );
}

/** The Group's Members with their Claims, and whether the viewer may change each one. */
export async function listGroupMembers(groupSlug: string) {
  const access = await requireGroupAccess(groupSlug);
  access.require("manageMembers");

  const rows = await prisma.usersToGroups.findMany({
    where: { groupId: access.group.id },
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
      group: { select: { createdById: true } },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return rows.map((row) => ({
    ...row.user,
    // Shown as a badge on the Member; access itself is decided by `access`.
    isCreator: row.user.id === row.group.createdById,
    canChange: access.can(changeMember(row.user.id)),
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

  return runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageMembers"),
    async ({ userId, groupId }): Promise<InviteMemberState> => {
      const emailRaw = formData.get("email");
      const typed = typeof emailRaw === "string" ? emailRaw.trim() : "";
      const parsed = inviteEmailSchema.safeParse(typed);
      if (!parsed.success) {
        const error = parsed.error.issues[0]?.message ?? "Ange en giltig e-postadress";
        return { status: "error", error, values: { email: typed } };
      }
      const email = parsed.data;

      const result = await inviteToGroup({ groupId, email, invitedById: userId });
      // The page lists Invitations; even a failed first email leaves one there.
      revalidateGroupMembersRoutes(groupSlug);
      if (result.status === "sent") {
        return { status: "sent", email };
      }
      return { status: "error", error: inviteFailureMessage(result), values: { email } };
    }
  );
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

/** The Group's pending and expired Invitations, for the members page. */
export async function listGroupInvitations(groupSlug: string) {
  const access = await requireGroupAccess(groupSlug);
  access.require("manageMembers");
  return findGroupInvitations(access.group.id);
}

const INVITATION_NOT_FOUND = "Inbjudan hittades inte";

/** "Ta bort" on a listed Invitation: deletes it, so its link stops working. */
export async function revokeGroupInvitation(formData: FormData) {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const invitationId = parseInvitationIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageMembers"),
    async ({ groupId }) => {
      if (!(await revokeInvitation(groupId, invitationId))) {
        throw new Error(INVITATION_NOT_FOUND);
      }
      revalidateGroupMembersRoutes(groupSlug);
    }
  );
}

export type ResendGroupInvitationResult = { ok: true; email: string } | { ok: false; error: string };

/** "Skicka igen" on a listed Invitation, pending or expired: the same re-send as "Bjud in". */
export async function resendGroupInvitation(formData: FormData): Promise<ResendGroupInvitationResult> {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const invitationId = parseInvitationIdFromFormData(formData);

  return runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageMembers"),
    async ({ userId, groupId }): Promise<ResendGroupInvitationResult> => {
      const result = await resendInvitation({ groupId, invitationId, invitedById: userId });
      if (result.status === "not-found") {
        return { ok: false, error: INVITATION_NOT_FOUND };
      }
      if (result.status !== "sent") {
        return { ok: false, error: inviteFailureMessage(result) };
      }

      revalidateGroupMembersRoutes(groupSlug);
      return { ok: true, email: result.email };
    }
  );
}

export async function removeMemberFromGroup(formData: FormData) {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const memberUserId = parseMemberUserIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) =>
      access.require(changeMember(memberUserId), {
        targetIsSelf: "Du kan inte ta bort dig själv från gruppen",
        targetIsCreator: "Gruppens administratör kan inte tas bort från gruppen",
      }),
    async ({ groupId }) => {
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
  );
}

/**
 * Sets a Member's complete Claim set in one transaction; concurrent saves resolve last-write-wins.
 * The caller must manage members, and may not target the Creator or themselves.
 */
export async function setMemberClaims(formData: FormData) {
  const groupSlug = parseMembershipGroupSlugFromFormData(formData);
  const memberUserId = parseMemberUserIdFromFormData(formData);
  const claims = parseGroupClaimsFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    // Creator status implies every Claim and is never stored as a Claim row.
    async ({ access }) =>
      access.require(changeMember(memberUserId), {
        targetIsCreator: "Gruppens administratör har alltid alla behörigheter",
        targetIsSelf: "Du kan inte ändra dina egna behörigheter",
      }),
    async ({ groupId }) => {
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
  );
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
