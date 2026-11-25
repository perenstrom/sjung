"use server";

import { saveWithFreeSlug } from "@/lib/content-slug";
import { findInGroup, findInGroupOrNull, notFoundMessage } from "@/lib/find-in-group";
import prisma from "@/lib/prisma";
import { parsePieceIdFromFormData } from "@/lib/schemas/pieces";
import { parseWritableGroupSlugFromFormData, parseWritableGroupSlugParam } from "@/lib/schemas/people";
import {
  parseHiddenItemFromFormData,
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
import { HIDDEN_SELECT, hiddenIdsOf } from "@/lib/setlists/hidden";
import { SetListSequence } from "@/lib/setlists/sequence";
import { PIECE_ALIAS_ORDER } from "@/lib/pieces/types";
import type { SetListDetail, SetListPieceContext, SetListPieceOption } from "@/lib/setlists/types";

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

/**
 * The Set list piece a Piece's page was opened from: its Set list, for the
 * breadcrumb, and what it hides. `null` when it is gone, isn't one of this
 * Piece's, or is in another Group, so the page shows the Piece on its own.
 */
export async function getSetListPieceContext(
  groupSlug: string,
  pieceId: string,
  setListPieceId: string,
): Promise<SetListPieceContext | null> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListPiece = await prisma.setListPiece.findFirst({
    where: { id: setListPieceId, pieceId, setList: { groupId } },
    select: { id: true, setList: { select: { id: true, slug: true, name: true } }, ...HIDDEN_SELECT },
  });
  if (!setListPiece) return null;
  return { id: setListPiece.id, setList: setListPiece.setList, ...hiddenIdsOf(setListPiece) };
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

/** Hides one of the Piece's Files or Links on this Set list piece only (CONTEXT.md, "Hidden"). */
export async function hideOnSetListPiece(formData: FormData) {
  await setHiddenOnSetListPiece(formData, true);
}

/** Shows a Hidden File or Link on this Set list piece again. */
export async function unhideOnSetListPiece(formData: FormData) {
  await setHiddenOnSetListPiece(formData, false);
}

/** Where each kind's hides are kept. Hiding what is already hidden, or unhiding what isn't, changes nothing. */
const HIDES = {
  file: {
    hide: (setListPieceId: string, fileId: string) =>
      prisma.setListPieceHiddenFile.createMany({ data: { setListPieceId, fileId }, skipDuplicates: true }),
    unhide: (setListPieceId: string, fileId: string) =>
      prisma.setListPieceHiddenFile.deleteMany({ where: { setListPieceId, fileId } }),
  },
  link: {
    hide: (setListPieceId: string, linkId: string) =>
      prisma.setListPieceHiddenLink.createMany({ data: { setListPieceId, linkId }, skipDuplicates: true }),
    unhide: (setListPieceId: string, linkId: string) =>
      prisma.setListPieceHiddenLink.deleteMany({ where: { setListPieceId, linkId } }),
  },
};

/**
 * Hides or shows a File or Link on a Set list piece. The File or Link must be
 * the Set list piece's Piece's; any other is refused as not found.
 */
async function setHiddenOnSetListPiece(formData: FormData, hidden: boolean) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceId = parseSetListPieceIdFromFormData(formData);
  const item = parseHiddenItemFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const setListPiece = await findInGroup(groupId, "setListPiece", setListPieceId, {
      select: { id: true, pieceId: true, setList: { select: { slug: true } }, piece: { select: { slug: true } } },
    });
    const found = await findInGroupOrNull(groupId, item.kind, item.id, { select: { pieceId: true } });
    if (found?.pieceId !== setListPiece.pieceId) {
      throw new Error(notFoundMessage(item.kind));
    }

    const store = HIDES[item.kind];
    await prisma.$transaction([
      (hidden ? store.hide : store.unhide)(setListPiece.id, item.id),
      prisma.setListPiece.update({ where: { id: setListPiece.id }, data: { updatedById: userId } }),
    ]);

    revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setList.slug);
    revalidateGroupPieceDetailRoutes(groupSlug, setListPiece.piece.slug);
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
