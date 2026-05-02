"use server";

import prisma from "@/lib/prisma";
import {
  parsePersonNameFromFormData,
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";
import { revalidateGroupPeopleRoutes } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

export async function getPeople(groupSlug: string) {
  const slug = parseWritableGroupSlugParam(groupSlug);
  const { groupId } = await getWritableGroupIdForSlug(slug);
  return prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
  });
}

export async function createPerson(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = parsePersonNameFromFormData(formData);

  await prisma.person.create({
    data: {
      name,
      groupId,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateGroupPeopleRoutes(groupSlug);
}
