"use server";

import { getPeopleForGroup } from "@/lib/people/queries";
import prisma from "@/lib/prisma";
import {
  parsePersonNameFromFormData,
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";
import { revalidateGroupPeopleRoutes } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runContentMutation } from "@/lib/tenant-group";

export async function getPeople(groupSlug: string) {
  const slug = parseWritableGroupSlugParam(groupSlug);
  const { groupId } = await getWritableGroupIdForSlug(slug);
  return getPeopleForGroup(groupId);
}

export async function createPerson(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const name = parsePersonNameFromFormData(formData);

  return runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const person = await prisma.person.create({
      data: {
        name,
        groupId,
        createdById: userId,
        updatedById: userId,
      },
      select: { id: true, name: true },
    });

    revalidateGroupPeopleRoutes(groupSlug);
    return person;
  });
}
