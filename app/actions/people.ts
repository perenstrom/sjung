"use server";

import {
  getPeopleForGroup,
  getPeopleWithPieceCountsForGroup,
  getPersonDetailForGroup,
  type PersonDetail,
  type PersonWithPieceCount,
} from "@/lib/people/queries";
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

/** The Group's People for Upphovspersoner, each with how many Pieces they are credited on. */
export async function getPeopleWithPieceCounts(groupSlug: string): Promise<PersonWithPieceCount[]> {
  const { groupId } = await getWritableGroupIdForSlug(parseWritableGroupSlugParam(groupSlug));
  return getPeopleWithPieceCountsForGroup(groupId);
}

/** One Person's page: the Pieces they are credited on. Null when the Person isn't in the Group. */
export async function getPersonDetail(groupSlug: string, personId: string): Promise<PersonDetail | null> {
  const { groupId } = await getWritableGroupIdForSlug(parseWritableGroupSlugParam(groupSlug));
  return getPersonDetailForGroup(groupId, personId);
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
