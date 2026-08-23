"use server";

import {
  noGuard,
  requirePieceInGroup,
  requireSetListInGroup,
  requireSetListNoteInGroup,
  requireSetListPieceInGroup,
  requireSetListPieceNoteInGroup,
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
  parseSetListPieceNoteIdFromFormData,
} from "@/lib/schemas/setlists";
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupSetListDetailRoutes,
  revalidateGroupSetListsRoutes,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runGroupMutation } from "@/lib/tenant-group";
import { SetListSequence } from "@/lib/setlists/sequence";
import type {
  SetListDetail,
  SetListPieceOption,
  SetListSequenceStep,
  SetListStep,
} from "@/lib/setlists/types";

type SetListRow = {
  id: string;
  name: string;
  date: Date | null;
  updatedAt: Date;
};

export type SetListPieceNoteListItem = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
};

async function getNextSetListStepPosition(setListId: string): Promise<number> {
  const [maxPiecePosition, maxNotePosition] = await Promise.all([
    prisma.setListPiece.aggregate({
      where: { setListId },
      _max: { position: true },
    }),
    prisma.setListNote.aggregate({
      where: { setListId },
      _max: { position: true },
    }),
  ]);

  return SetListSequence.nextPosition(
    maxPiecePosition._max.position,
    maxNotePosition._max.position
  );
}

async function getSetListSteps(setListId: string): Promise<SetListSequenceStep[]> {
  const [pieces, notes] = await Promise.all([
    prisma.setListPiece.findMany({
      where: { setListId },
      select: { id: true, position: true },
    }),
    prisma.setListNote.findMany({
      where: { setListId },
      select: { id: true, position: true },
    }),
  ]);

  return [
    ...pieces.map((entry) => ({ kind: "piece" as const, id: entry.id, position: entry.position })),
    ...notes.map((entry) => ({ kind: "note" as const, id: entry.id, position: entry.position })),
  ];
}

function applySetListStepPositionUpdates(updates: SetListSequenceStep[], userId: string) {
  return updates.map((update) =>
    update.kind === "piece"
      ? prisma.setListPiece.update({
          where: { id: update.id },
          data: { position: update.position, updatedById: userId },
        })
      : prisma.setListNote.update({
          where: { id: update.id },
          data: { position: update.position, updatedById: userId },
        })
  );
}

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
      pieces: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          pieceId: true,
          position: true,
          piece: {
            select: {
              name: true,
            },
          },
        },
      },
      notes: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          content: true,
          position: true,
        },
      },
    },
  });

  if (!setList) {
    return null;
  }

  const steps: SetListStep[] = [
    ...setList.pieces.map((entry) => ({
      kind: "piece" as const,
      id: entry.id,
      pieceId: entry.pieceId,
      pieceName: entry.piece.name,
      position: entry.position,
    })),
    ...setList.notes.map((entry) => ({
      kind: "note" as const,
      id: entry.id,
      content: entry.content,
      position: entry.position,
    })),
  ].sort((a, b) => a.position - b.position);

  return {
    id: setList.id,
    name: setList.name,
    date: setList.date,
    updatedAt: setList.updatedAt,
    steps,
  };
}

/** Minimal title read for navigation; returns null when the set list is missing or inaccessible. */
export async function getSetListTitleForBreadcrumb(
  groupSlug: string,
  setListId: string
): Promise<{ title: string } | null> {
  try {
    const slug = parseWritableGroupSlugParam(groupSlug);
    const { groupId } = await getWritableGroupIdForSlug(slug);
    const setList = await prisma.setList.findFirst({
      where: { id: setListId, groupId },
      select: { name: true },
    });
    if (!setList) {
      return null;
    }
    return { title: setList.name };
  } catch {
    return null;
  }
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
      const nextPosition = await getNextSetListStepPosition(setList.id);

      await prisma.setListPiece.create({
        data: {
          setListId: setList.id,
          pieceId: piece.id,
          position: nextPosition,
          createdById: userId,
          updatedById: userId,
        },
      });

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
    async ({ userId }, setListPiece) => {
      await prisma.setListPiece.delete({
        where: { id: setListPiece.id },
      });
      const remainingSteps = await getSetListSteps(setListPiece.setListId);
      const updates = SetListSequence.positionsAfterRemoval(remainingSteps);
      await prisma.$transaction(applySetListStepPositionUpdates(updates, userId));

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
      const steps = await getSetListSteps(setList.id);
      const updates = SetListSequence.positionsAfterReorder(steps, orderedSetListStepIds);

      await prisma.$transaction(applySetListStepPositionUpdates(updates, userId));

      revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
    }
  );
}

export async function listSetListPieceNotes(
  groupSlug: string,
  setListPieceId: string
): Promise<SetListPieceNoteListItem[]> {
  const slug = parseWritableGroupSlugParam(groupSlug);
  const { groupId } = await getWritableGroupIdForSlug(slug);
  const setListPiece = await requireSetListPieceInGroup(setListPieceId, groupId);

  return prisma.setListPieceNote.findMany({
    where: { setListPieceId: setListPiece.id, groupId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      updatedById: true,
    },
  });
}

export async function createSetListPieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceId = parseSetListPieceIdFromFormData(formData);
  const content = parseSetListNoteContentFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireSetListPieceInGroup(setListPieceId, groupId, {
        select: { id: true, setListId: true },
      }),
    async ({ userId, groupId }, setListPiece) => {
      await prisma.setListPieceNote.create({
        data: {
          content,
          setListPieceId: setListPiece.id,
          groupId,
          createdById: userId,
          updatedById: userId,
        },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setListId);
    }
  );
}

export async function updateSetListPieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceNoteId = parseSetListPieceNoteIdFromFormData(formData);
  const content = parseSetListNoteContentFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireSetListPieceNoteInGroup(setListPieceNoteId, groupId, {
        select: { id: true, setListPiece: { select: { setListId: true } } },
      }),
    async ({ userId }, note) => {
      await prisma.setListPieceNote.update({
        where: { id: note.id },
        data: {
          content,
          updatedById: userId,
        },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, note.setListPiece.setListId);
    }
  );
}

export async function deleteSetListPieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const setListPieceNoteId = parseSetListPieceNoteIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireSetListPieceNoteInGroup(setListPieceNoteId, groupId, {
        select: { id: true, setListPiece: { select: { setListId: true } } },
      }),
    async (_ctx, note) => {
      await prisma.setListPieceNote.delete({
        where: { id: note.id },
      });

      revalidateGroupSetListDetailRoutes(groupSlug, note.setListPiece.setListId);
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
      const nextPosition = await getNextSetListStepPosition(setList.id);

      await prisma.setListNote.create({
        data: {
          content,
          setListId: setList.id,
          position: nextPosition,
          createdById: userId,
          updatedById: userId,
        },
      });

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
    async ({ userId }, note) => {
      await prisma.setListNote.delete({
        where: { id: note.id },
      });
      const remainingSteps = await getSetListSteps(note.setListId);
      const updates = SetListSequence.positionsAfterRemoval(remainingSteps);
      await prisma.$transaction(applySetListStepPositionUpdates(updates, userId));

      revalidateGroupSetListDetailRoutes(groupSlug, note.setListId);
    }
  );
}
