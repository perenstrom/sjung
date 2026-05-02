"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { isReservedGroupSlug, slugifyGroupName } from "@/lib/group-slug";
import { requireCreatorGroupById, requireCreatorGroupBySlug } from "@/lib/actions/guards";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";
import { setActiveGroupSlugCookie } from "@/lib/active-group-cookie";
import { readGroupSlugInput, readIdField, readRequiredString } from "@/lib/actions/input";
import {
  parseGroupIdFromFormData,
  parseGroupNameFromFormData,
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
    },
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    isCreator: g.createdById === user.id,
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

function readEmail(formData: FormData): string {
  return readRequiredString(formData, "email", "E-post krävs").toLowerCase();
}

function readGroupSlug(formData: FormData): string {
  return readGroupSlugInput(formData, "Ogiltig grupp");
}

export async function listGroupMembers(groupSlug: string) {
  const { groupId } = await requireCreatorGroupBySlug(groupSlug);

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
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return rows.map((row) => row.user);
}

export async function addMemberToGroup(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const email = readEmail(formData);
  const { groupId } = await requireCreatorGroupBySlug(groupSlug);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw new Error("Ingen användare med den e-posten hittades");
  }

  const exists = await prisma.usersToGroups.findUnique({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId,
      },
    },
    select: { userId: true },
  });
  if (exists) {
    throw new Error("Användaren är redan medlem i gruppen");
  }

  await prisma.usersToGroups.create({
    data: {
      userId: user.id,
      groupId,
    },
  });

  revalidateGroupMembersRoutes(groupSlug);
}

export async function removeMemberFromGroup(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const memberUserId = readIdField(formData, "memberUserId", "Ogiltig medlem");

  const { userId, groupId } = await requireCreatorGroupBySlug(groupSlug);
  if (memberUserId === userId) {
    throw new Error("Du kan inte ta bort dig själv från gruppen");
  }

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
