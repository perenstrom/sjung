"use server";

import {
  readGroupSlugInput,
  readIdField,
  readOptionalDate as readOptionalDateInput,
  readRequiredString,
} from "@/lib/actions/input";
import {
  requirePieceInGroup,
  requireSetListInGroup,
  requireSetListNoteInGroup,
  requireSetListPieceInGroup,
  requireSetListPieceNoteInGroup,
} from "@/lib/actions/guards";
import prisma from "@/lib/prisma";
import { parseWritableGroupSlugParam } from "@/lib/schemas/people";
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupSetListDetailRoutes,
  revalidateGroupSetListsRoutes,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";
import type {
  SetListDetail,
  SetListPieceOption,
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

function readGroupSlug(formData: FormData): string {
  return readGroupSlugInput(formData);
}

function readSetListId(formData: FormData): string {
  return readIdField(formData, "setListId", "Repertoar saknas");
}

function readSetListPieceId(formData: FormData): string {
  return readIdField(formData, "setListPieceId", "Repertoarpost saknas");
}

function readSetListPieceNoteId(formData: FormData): string {
  return readIdField(formData, "setListPieceNoteId", "Anteckning saknas");
}

function readSetListNoteId(formData: FormData): string {
  return readIdField(formData, "setListNoteId", "Anteckning saknas");
}

function readPieceId(formData: FormData): string {
  return readIdField(formData, "pieceId", "Stycke saknas");
}

function readOrderedSetListPieceIds(formData: FormData): string[] {
  const raw = readRequiredString(formData, "orderedSetListPieceIds", "Ny ordning saknas");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Ogiltig ordning");
    }
    const ids = parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);
    if (ids.length === 0) {
      throw new Error("Ogiltig ordning");
    }
    return ids;
  } catch {
    throw new Error("Ogiltig ordning");
  }
}

function readName(formData: FormData): string {
  return readRequiredString(formData, "name", "Namn krävs");
}

function readSetListPieceNoteContent(formData: FormData): string {
  return readRequiredString(formData, "content", "Anteckning krävs");
}

function readSetListNoteContent(formData: FormData): string {
  return readRequiredString(formData, "content", "Anteckning krävs");
}

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

  const maxPosition = Math.max(
    maxPiecePosition._max.position ?? 0,
    maxNotePosition._max.position ?? 0
  );
  return maxPosition + 1;
}

function readOptionalDate(formData: FormData): Date | null {
  return readOptionalDateInput(formData, "date", "Ogiltigt datum");
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
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const name = readName(formData);
  const date = readOptionalDate(formData);

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
}

export async function updateSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);
  const name = readName(formData);
  const date = readOptionalDate(formData);

  const existing = await requireSetListInGroup(setListId, groupId);

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

export async function deleteSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);

  const existing = await requireSetListInGroup(setListId, groupId);

  await prisma.setList.delete({
    where: { id: existing.id },
  });

  revalidateGroupSetListsRoutes(groupSlug);
}

export async function addPieceToSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);
  const pieceId = readPieceId(formData);

  const [setList, piece] = await Promise.all([
    requireSetListInGroup(setListId, groupId),
    requirePieceInGroup(pieceId, groupId),
  ]);
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

export async function removePieceFromSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListPieceId = readSetListPieceId(formData);

  const setListPiece = await requireSetListPieceInGroup(setListPieceId, groupId, {
    select: { id: true, setListId: true, pieceId: true },
  });

  await prisma.setListPiece.delete({
    where: { id: setListPiece.id },
  });
  const remainingPieces = await prisma.setListPiece.findMany({
    where: { setListId: setListPiece.setListId },
    select: { id: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  await prisma.$transaction(
    remainingPieces.map((entry, index) =>
      prisma.setListPiece.update({
        where: { id: entry.id },
        data: { position: index + 1, updatedById: userId },
      })
    )
  );

  revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setListId);
  revalidateGroupPieceDetailRoutes(groupSlug, setListPiece.pieceId);
}

export async function reorderSetListPieces(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);
  const orderedSetListPieceIds = readOrderedSetListPieceIds(formData);
  const orderedSet = new Set(orderedSetListPieceIds);
  if (orderedSet.size !== orderedSetListPieceIds.length) {
    throw new Error("Ogiltig ordning");
  }

  const setList = await requireSetListInGroup(setListId, groupId);
  const existingPieces = await prisma.setListPiece.findMany({
    where: { setListId: setList.id },
    select: { id: true },
  });
  if (existingPieces.length !== orderedSetListPieceIds.length) {
    throw new Error("Ogiltig ordning");
  }
  const existingSet = new Set(existingPieces.map((entry) => entry.id));
  for (const id of orderedSetListPieceIds) {
    if (!existingSet.has(id)) {
      throw new Error("Ogiltig ordning");
    }
  }

  await prisma.$transaction(
    orderedSetListPieceIds.map((setListPieceId, index) =>
      prisma.setListPiece.update({
        where: { id: setListPieceId },
        data: { position: index + 1, updatedById: userId },
      })
    )
  );

  revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
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
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListPieceId = readSetListPieceId(formData);
  const content = readSetListPieceNoteContent(formData);

  const setListPiece = await requireSetListPieceInGroup(setListPieceId, groupId, {
    select: { id: true, setListId: true },
  });

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

export async function updateSetListPieceNote(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListPieceNoteId = readSetListPieceNoteId(formData);
  const content = readSetListPieceNoteContent(formData);

  const note = await requireSetListPieceNoteInGroup(setListPieceNoteId, groupId, {
    select: { id: true, setListPiece: { select: { setListId: true } } },
  });

  await prisma.setListPieceNote.update({
    where: { id: note.id },
    data: {
      content,
      updatedById: userId,
    },
  });

  revalidateGroupSetListDetailRoutes(groupSlug, note.setListPiece.setListId);
}

export async function deleteSetListPieceNote(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListPieceNoteId = readSetListPieceNoteId(formData);

  const note = await requireSetListPieceNoteInGroup(setListPieceNoteId, groupId, {
    select: { id: true, setListPiece: { select: { setListId: true } } },
  });

  await prisma.setListPieceNote.delete({
    where: { id: note.id },
  });

  revalidateGroupSetListDetailRoutes(groupSlug, note.setListPiece.setListId);
}

export async function appendSetListNote(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);
  const content = readSetListNoteContent(formData);

  const setList = await requireSetListInGroup(setListId, groupId);
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

export async function deleteSetListNote(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListNoteId = readSetListNoteId(formData);

  const note = await requireSetListNoteInGroup(setListNoteId, groupId, {
    select: { id: true, setListId: true },
  });

  await prisma.setListNote.delete({
    where: { id: note.id },
  });

  revalidateGroupSetListDetailRoutes(groupSlug, note.setListId);
}
