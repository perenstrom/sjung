"use server";

import prisma from "@/lib/prisma";
import { readGroupSlugInput, readRequiredString } from "@/lib/actions/input";
import { revalidateGroupPeopleRoutes } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

function readGroupSlug(formData: FormData): string {
  return readGroupSlugInput(formData);
}

export async function getPeople(groupSlug: string) {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
  });
}

export async function createPerson(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = readRequiredString(formData, "name", "Namn krävs");

  await prisma.person.create({
    data: {
      name: name.trim(),
      groupId,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateGroupPeopleRoutes(groupSlug);
}
