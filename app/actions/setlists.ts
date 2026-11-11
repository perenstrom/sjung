"use server";

import {
  noGuard,
  requirePieceInGroup,
  requireSetListInGroup,
  requireSetListNoteInGroup,
  requireSetListPieceInGroup,
} from "@/lib/actions/guards";
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
import { getWritableGroupIdForSlug, runGroupMutation } from "@/lib/tenant-group";
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

  await runGroupMutation(groupSlug, noGuard, async ({ userId, groupId }) => {
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

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requireSetListInGroup(setListId, groupId),
    async ({ userId }, existing) => {
      await prisma.setList.update({
        where: { id: existing.id },
        data: {
          name,
          date,
          updatedById: userId,
        },
      });

      revalidateGroupSetListsRoutes(groupSlug);
    }
  );
}

export async function deleteSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requireSetListInGroup(setListId, groupId),
    async (_ctx, existing) => {
      await prisma.setList.delete({
        where: { id: existing.id },
      });

      revalidateGroupSetListsRoutes(groupSlug);
    }
  );
}

export async function addPieceToSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      Promise.all([
        requireSetListInGroup(setListId, groupId),
        requirePieceInGroup(pieceId, groupId),
      ]),
    async ({ userId }, [setList, piece]) => {
      await SetListSequence.append(setList.id, { kind: "piece", pieceId: piece.id }, userId);

      revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
      revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
    }
  );
}

export async function removePieceFromSetList(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceId = parseSetListPieceIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireSetListPieceInGroup(setListPieceId, groupId, {
        select: { id: true, setListId: true, pieceId: true },
      }),
    async (_ctx, setListPiece) => {
      await prisma.setListPiece.delete({
        where: { id: setListPiece.id },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setListId);
      revalidateGroupPieceDetailRoutes(groupSlug, setListPiece.pieceId);
    }
  );
}

export async function reorderSetListSteps(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const orderedSetListStepIds = parseOrderedSetListStepIdsFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requireSetListInGroup(setListId, groupId),
    async ({ userId }, setList) => {
      await SetListSequence.reorder(setList.id, orderedSetListStepIds, userId);

      revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
    }
  );
}

export async function appendSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListId = parseSetListIdFromFormData(formData);
  const content = parseSetListNoteContentFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requireSetListInGroup(setListId, groupId),
    async ({ userId }, setList) => {
      await SetListSequence.append(setList.id, { kind: "note", content }, userId);

      revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
    }
  );
}

export async function deleteSetListNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListNoteId = parseSetListNoteIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireSetListNoteInGroup(setListNoteId, groupId, {
        select: { id: true, setListId: true },
      }),
    async (_ctx, note) => {
      await prisma.setListNote.delete({
        where: { id: note.id },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, note.setListId);
    }
  );
}
