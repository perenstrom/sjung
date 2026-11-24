"use server";

import { redirect } from "next/navigation";

import {
  getPeopleForGroup,
  getPeopleWithPieceCountsForGroup,
  getPersonDetailForGroup,
  type PersonDetail,
  type PersonWithPieceCount,
} from "@/lib/people/queries";
import { saveWithFreeSlug } from "@/lib/content-slug";
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
    const person = await saveWithFreeSlug("person", groupId, name, (tx, slug) =>
      tx.person.create({
        data: { name, slug, groupId, createdById: userId, updatedById: userId },
        select: { id: true, name: true },
      }),
    );

    revalidateGroupPeopleRoutes(groupSlug);
    return person;
  });
}

/**
 * Renames a Person everywhere at once: every Credit shows the new name. Another
 * Person may share it. Answers with the Person's new Slug, since their page moves.
 */
export async function renamePerson(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const personId = parsePersonIdFromFormData(formData);
  const name = parsePersonNameFromFormData(formData);

  return runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const person = await findInGroup(groupId, "person", personId);
    const renamed = await saveWithFreeSlug(
      "person",
      groupId,
      name,
      (tx, slug) =>
        tx.person.update({
          where: { id: person.id },
          data: { name, slug, updatedById: userId },
          select: { slug: true },
        }),
      { exceptId: person.id },
    );

    revalidateGroupPersonRoutes(groupSlug, renamed.slug);
    return renamed;
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
    const person = await findInGroup(groupId, "person", personId, { select: { id: true, slug: true } });
    await prisma.person.delete({ where: { id: person.id } });

    revalidateGroupPersonRoutes(groupSlug, person.slug);
  });
  redirect(groupPeoplePath(groupSlug));
}
