"use server";

import { saveWithFreeSlug } from "@/lib/content-slug";
import { findInGroup } from "@/lib/find-in-group";
import prisma from "@/lib/prisma";
import { parsePieceIdFromFormData } from "@/lib/schemas/pieces";
import { parseWritableGroupSlugFromFormData, parseWritableGroupSlugParam } from "@/lib/schemas/people";
import {
  parseOptionalSetListDateFromFormData,
  parseOrderedSetListStepIdsFromFormData,
  parseSetListCurrentFromFormData,
  parseSetListIdFromFormData,
  parseSetListNameFromFormData,
  parseSetListNoteContentFromFormData,
  parseSetListNoteIdFromFormData,
  parseSetListPieceIdFromFormData,
} from "@/lib/schemas/setlists";
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupSetListDetailRoutes,
  revalidateGroupSetListsRoutes,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runContentMutation } from "@/lib/tenant-group";
import { SetListSequence } from "@/lib/setlists/sequence";
import { PIECE_ALIAS_ORDER } from "@/lib/pieces/types";
import type { SetListDetail, SetListPieceOption } from "@/lib/setlists/types";

type SetListRow = {
  id: string;
  slug: string;
  name: string;
  date: Date | null;
  current: boolean;
  updatedAt: Date;
};

export async function getSetLists(groupSlug: string): Promise<SetListRow[]> {
  const slug = parseWritableGroupSlugParam(groupSlug);
  const { groupId } = await getWritableGroupIdForSlug(slug);
  return prisma.setList.findMany({
    where: { groupId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      date: true,
      current: true,
      updatedAt: true,
    },
  });
}

export async function getSetListDetail(groupSlug: string, setListId: string): Promise<SetListDetail | null> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setList = await prisma.setList.findFirst({
    where: { id: setListId, groupId },
    select: {
      id: true,
      name: true,
      date: true,
      current: true,
      updatedAt: true,
    },
  });

  if (!setList) {
    return null;
  }

  return {
    id: setList.id,
    name: setList.name,
    date: setList.date,
    current: setList.current,
    updatedAt: setList.updatedAt,
    steps: await SetListSequence.steps(setList.id),
  };
}

export async function getSetListPieceOptions(groupSlug: string): Promise<SetListPieceOption[]> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return prisma.piece.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      aliases: { orderBy: PIECE_ALIAS_ORDER, select: { name: true } },
    },
  });
}

export async function createSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const name = parseSetListNameFromFormData(formData);
  const date = parseOptionalSetListDateFromFormData(formData);
  const current = parseSetListCurrentFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    await saveWithFreeSlug("setList", groupId, name, (tx, slug) =>
      tx.setList.create({
        data: { name, slug, date, current, groupId, createdById: userId, updatedById: userId },
      }),
    );

    revalidateGroupSetListsRoutes(groupSlug);
  });
}

export async function updateSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const name = parseSetListNameFromFormData(formData);
  const date = parseOptionalSetListDateFromFormData(formData);
  const current = parseSetListCurrentFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const existing = await findInGroup(groupId, "setList", setListId);
    await saveWithFreeSlug(
      "setList",
      groupId,
      name,
      (tx, slug) =>
        tx.setList.update({
          where: { id: existing.id },
          data: { name, slug, date, current, updatedById: userId },
        }),
      { exceptId: existing.id },
    );

    revalidateGroupSetListsRoutes(groupSlug);
  });
}

export async function deleteSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const existing = await findInGroup(groupId, "setList", setListId);
    await prisma.setList.delete({
      where: { id: existing.id },
    });

    revalidateGroupSetListsRoutes(groupSlug);
  });
}

export async function addPieceToSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const [setList, piece] = await Promise.all([
      findInGroup(groupId, "setList", setListId, { select: { id: true, slug: true } }),
      findInGroup(groupId, "piece", pieceId, { select: { id: true, slug: true } }),
    ]);
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: piece.id }, userId);

    revalidateGroupSetListDetailRoutes(groupSlug, setList.slug);
    revalidateGroupPieceDetailRoutes(groupSlug, piece.slug);
  });
}

export async function removePieceFromSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceId = parseSetListPieceIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const setListPiece = await findInGroup(groupId, "setListPiece", setListPieceId, {
      select: { id: true, setList: { select: { slug: true } }, piece: { select: { slug: true } } },
    });
    await prisma.setListPiece.delete({
      where: { id: setListPiece.id },
    });

    revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setList.slug);
    revalidateGroupPieceDetailRoutes(groupSlug, setListPiece.piece.slug);
  });
}

/** Removes every occurrence of the Piece from the Set list, as the Piece page does. */
export async function removePieceFromWholeSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const [setList, piece] = await Promise.all([
      findInGroup(groupId, "setList", setListId, { select: { id: true, slug: true } }),
      findInGroup(groupId, "piece", pieceId, { select: { id: true, slug: true } }),
    ]);
    await prisma.setListPiece.deleteMany({
      where: { setListId: setList.id, pieceId: piece.id },
    });

    revalidateGroupSetListDetailRoutes(groupSlug, setList.slug);
    revalidateGroupPieceDetailRoutes(groupSlug, piece.slug);
  });
}

/** Allowed with `manageContent` or `reorderSetLists` (ADR-0012), for any of the Group's Set lists. */
export async function reorderSetListSteps(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const orderedSetListStepIds = parseOrderedSetListStepIdsFromFormData(formData);

  await runContentMutation(
    groupSlug,
    async ({ userId, groupId }) => {
      const setList = await findInGroup(groupId, "setList", setListId, { select: { id: true, slug: true } });
      await SetListSequence.reorder(setList.id, orderedSetListStepIds, userId);

      revalidateGroupSetListDetailRoutes(groupSlug, setList.slug);
    },
    { alsoAllowedBy: "reorderSetLists" },
  );
}

/** What a Running-order note action also accepts besides `manageContent` (ADR-0012), in any of the Group's Set lists. */
const ALSO_ALLOWED_BY_NOTES_CLAIM = { alsoAllowedBy: "manageRunningOrderNotes" } as const;

export async function appendSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const content = parseSetListNoteContentFromFormData(formData);

  await runContentMutation(
    groupSlug,
    async ({ userId, groupId }) => {
      const setList = await findInGroup(groupId, "setList", setListId, { select: { id: true, slug: true } });
      await SetListSequence.append(setList.id, { kind: "note", content }, userId);

      revalidateGroupSetListDetailRoutes(groupSlug, setList.slug);
    },
    ALSO_ALLOWED_BY_NOTES_CLAIM,
  );
}

/** Changes only the text: the note keeps its place in the running order. */
export async function updateSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListNoteId = parseSetListNoteIdFromFormData(formData);
  const content = parseSetListNoteContentFromFormData(formData);

  await runContentMutation(
    groupSlug,
    async ({ userId, groupId }) => {
      const note = await findInGroup(groupId, "setListNote", setListNoteId, {
        select: { id: true, setList: { select: { slug: true } } },
      });
      await prisma.setListNote.update({
        where: { id: note.id },
        data: { content, updatedById: userId },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, note.setList.slug);
    },
    ALSO_ALLOWED_BY_NOTES_CLAIM,
  );
}

export async function deleteSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListNoteId = parseSetListNoteIdFromFormData(formData);

  await runContentMutation(
    groupSlug,
    async ({ groupId }) => {
      const note = await findInGroup(groupId, "setListNote", setListNoteId, {
        select: { id: true, setList: { select: { slug: true } } },
      });
      await prisma.setListNote.delete({
        where: { id: note.id },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, note.setList.slug);
    },
    ALSO_ALLOWED_BY_NOTES_CLAIM,
  );
}
