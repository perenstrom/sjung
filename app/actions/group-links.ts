"use server";

import prisma from "@/lib/prisma";
import { findInGroup } from "@/lib/find-in-group";
import { runGroupMutation } from "@/lib/tenant-group";
import { parseGroupSlugFromFormData } from "@/lib/schemas/groups";
import { parseGroupLinkFromFormData, parseGroupLinkIdFromFormData } from "@/lib/schemas/group-links";
import { revalidateGroupHomeRoute } from "@/lib/revalidate/group-routes";

/** Marks Home's own content as changed, for the Group overview's "last changed". */
function touchGroupHome(groupId: string, userId: string) {
  return prisma.group.update({ where: { id: groupId }, data: { homeUpdatedAt: new Date(), updatedById: userId } });
}

/** _Lägg till länk_: adds a Group link to Home. */
export async function addGroupLink(formData: FormData) {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const { label, url } = parseGroupLinkFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageGroupHome"),
    async ({ userId, groupId }) => {
      await prisma.$transaction([
        prisma.groupLink.create({ data: { groupId, label, url, createdById: userId, updatedById: userId } }),
        touchGroupHome(groupId, userId),
      ]);
      revalidateGroupHomeRoute(groupSlug);
    },
  );
}

/** _Redigera_ on a Group link: changes its label and address. The last save wins. */
export async function updateGroupLink(formData: FormData) {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const linkId = parseGroupLinkIdFromFormData(formData);
  const { label, url } = parseGroupLinkFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageGroupHome"),
    async ({ userId, groupId }) => {
      const { id } = await findInGroup(groupId, "groupLink", linkId);
      await prisma.$transaction([
        prisma.groupLink.update({ where: { id }, data: { label, url, updatedById: userId } }),
        touchGroupHome(groupId, userId),
      ]);
      revalidateGroupHomeRoute(groupSlug);
    },
  );
}

/** _Ta bort_ on a Group link. */
export async function removeGroupLink(formData: FormData) {
  const groupSlug = parseGroupSlugFromFormData(formData);
  const linkId = parseGroupLinkIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageGroupHome"),
    async ({ userId, groupId }) => {
      const { id } = await findInGroup(groupId, "groupLink", linkId);
      await prisma.$transaction([prisma.groupLink.delete({ where: { id } }), touchGroupHome(groupId, userId)]);
      revalidateGroupHomeRoute(groupSlug);
    },
  );
}
