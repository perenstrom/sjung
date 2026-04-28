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
  requireSetListPieceInGroup,
} from "@/lib/actions/guards";
import prisma from "@/lib/prisma";
import {
  revalidateGroupSetListDetailRoutes,
  revalidateGroupSetListsRoutes,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

type SetListRow = {
  id: string;
  name: string;
  date: Date | null;
  updatedAt: Date;
};

export type SetListDetail = {
  id: string;
  name: string;
  date: Date | null;
  updatedAt: Date;
  pieces: Array<{
    id: string;
    pieceId: string;
    pieceName: string;
    createdAt: Date;
  }>;
};

export type SetListPieceOption = {
  id: string;
  name: string;
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

function readPieceId(formData: FormData): string {
  return readIdField(formData, "pieceId", "Stycke saknas");
}

function readName(formData: FormData): string {
  return readRequiredString(formData, "name", "Namn krävs");
}

function readOptionalDate(formData: FormData): Date | null {
  return readOptionalDateInput(formData, "date", "Ogiltigt datum");
}

export async function getSetLists(groupSlug: string): Promise<SetListRow[]> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
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
        select: {
          id: true,
          pieceId: true,
          createdAt: true,
          piece: {
            select: {
              name: true,
            },
          },
        },
      },
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
    pieces: setList.pieces
      .map((entry) => ({
        id: entry.id,
        pieceId: entry.pieceId,
        pieceName: entry.piece.name,
        createdAt: entry.createdAt,
      }))
      .sort((a, b) => a.pieceName.localeCompare(b.pieceName, "sv-SE")),
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

  await prisma.setListPiece.create({
    data: {
      setListId: setList.id,
      pieceId: piece.id,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateGroupSetListDetailRoutes(groupSlug, setList.id);
}

export async function removePieceFromSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListPieceId = readSetListPieceId(formData);

  const setListPiece = await requireSetListPieceInGroup(setListPieceId, groupId, {
    select: { id: true, setListId: true },
  });

  await prisma.setListPiece.delete({
    where: { id: setListPiece.id },
  });

  revalidateGroupSetListDetailRoutes(groupSlug, setListPiece.setListId);
}
