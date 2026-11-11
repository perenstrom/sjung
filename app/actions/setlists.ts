"use server";

import { findInGroup } from "@/lib/find-in-group";
import prisma from "@/lib/prisma";
import { parsePieceIdFromFormData } from "@/lib/schemas/pieces";
import {
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";
import {
  parseOptionalSetListDateFromFormData,
  parseOrderedSetListStepIdsFromFormData,
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
import type { SetListDetail, SetListPieceOption } from "@/lib/setlists/types";

type SetListRow = {
  id: string;
  name: string;
  date: Date | null;
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
      name: true,
      date: true,
      updatedAt: true,
    },
  });
}

export async function getSetListDetail(
  groupSlug: string,
  setListId: string
): Promise<SetListDetail | null> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setList = await prisma.setList.findFirst({
    where: { id: setListId, groupId },
    select: {
      id: true,
      name: true,
      date: true,
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
    },
  });
}

export async function createSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const name = parseSetListNameFromFormData(formData);
  const date = parseOptionalSetListDateFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    await prisma.setList.create({
      data: {
        name,
        date,
        groupId,
        createdById: userId,
        updatedById: userId,
      },
    });

    revalidateGroupSetListsRoutes(groupSlug);
  });
}

export async function updateSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const name = parseSetListNameFromFormData(formData);
  const date = parseOptionalSetListDateFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const existing = await findInGroup(groupId, "setList", setListId);
    await prisma.setList.update({
      where: { id: existing.id },
      data: {
        name,
        date,
        updatedById: userId,
      },
    });

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
      findInGroup(groupId, "setList", setListId),
      findInGroup(groupId, "piece", pieceId),
    ]);
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: piece.id }, userId);

    revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
    revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
  });
}

export async function removePieceFromSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceId = parseSetListPieceIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const setListPiece = await findInGroup(groupId, "setListPiece", setListPieceId, {
      select: { id: true, setListId: true, pieceId: true },
    });
    await prisma.setListPiece.delete({
      where: { id: setListPiece.id },
    });

    revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setListId);
    revalidateGroupPieceDetailRoutes(groupSlug, setListPiece.pieceId);
  });
}

export async function reorderSetListSteps(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const orderedSetListStepIds = parseOrderedSetListStepIdsFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const setList = await findInGroup(groupId, "setList", setListId);
    await SetListSequence.reorder(setList.id, orderedSetListStepIds, userId);

    revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
  });
}

export async function appendSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const content = parseSetListNoteContentFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const setList = await findInGroup(groupId, "setList", setListId);
    await SetListSequence.append(setList.id, { kind: "note", content }, userId);

    revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
  });
}

export async function deleteSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListNoteId = parseSetListNoteIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const note = await findInGroup(groupId, "setListNote", setListNoteId, {
      select: { id: true, setListId: true },
    });
    await prisma.setListNote.delete({
      where: { id: note.id },
    });

    revalidateGroupSetListDetailRoutes(groupSlug, note.setListId);
  });
}
