"use server";

import { redirect } from "next/navigation";

import {
  getPeopleForGroup,
  getPeopleWithPieceCountsForGroup,
  getPersonDetailForGroup,
  type PersonDetail,
  type PersonWithPieceCount,
} from "@/lib/people/queries";
import { findInGroup } from "@/lib/find-in-group";
import { groupPeoplePath } from "@/lib/groups/routes";
import prisma from "@/lib/prisma";
import {
  parsePersonIdFromFormData,
  parsePersonNameFromFormData,
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";
import { revalidateGroupPersonRoutes, revalidateGroupPeopleRoutes } from "@/lib/revalidate/group-routes";
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

/** Renames a Person everywhere at once: every Credit shows the new name. Another Person may share it. */
export async function renamePerson(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const personId = parsePersonIdFromFormData(formData);
  const name = parsePersonNameFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const person = await findInGroup(groupId, "person", personId);
    await prisma.person.update({
      where: { id: person.id },
      data: { name, updatedById: userId },
    });

    revalidateGroupPersonRoutes(groupSlug, person.id);
  });
}

/**
 * Deletes a Person together with all of their Credits (the database cascades
 * them), then sends the user to Upphovspersoner, since the Person's page is gone.
 */
export async function deletePerson(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const personId = parsePersonIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const person = await findInGroup(groupId, "person", personId);
    await prisma.person.delete({ where: { id: person.id } });

    revalidateGroupPersonRoutes(groupSlug, person.id);
  });
  redirect(groupPeoplePath(groupSlug));
}
