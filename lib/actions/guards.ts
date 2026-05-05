import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

const DEFAULT_PIECE_SELECT = { id: true } satisfies Prisma.PieceSelect;
const DEFAULT_SET_LIST_SELECT = { id: true } satisfies Prisma.SetListSelect;
const DEFAULT_SET_LIST_PIECE_SELECT = { id: true } satisfies Prisma.SetListPieceSelect;
const DEFAULT_SET_LIST_PIECE_NOTE_SELECT = {
  id: true,
  setListPieceId: true,
} satisfies Prisma.SetListPieceNoteSelect;
const DEFAULT_FILE_SELECT = { id: true } satisfies Prisma.FileSelect;
const DEFAULT_LINK_SELECT = { id: true } satisfies Prisma.LinkSelect;
const DEFAULT_PIECE_NOTE_SELECT = { id: true, pieceId: true } satisfies Prisma.PieceNoteSelect;
const DEFAULT_GROUP_SELECT = { slug: true } satisfies Prisma.GroupSelect;

type PieceGuardOptions<TSelect extends Prisma.PieceSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type SetListGuardOptions<TSelect extends Prisma.SetListSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type SetListPieceGuardOptions<TSelect extends Prisma.SetListPieceSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type SetListPieceNoteGuardOptions<TSelect extends Prisma.SetListPieceNoteSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type FileGuardOptions<TSelect extends Prisma.FileSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type LinkGuardOptions<TSelect extends Prisma.LinkSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type PieceNoteGuardOptions<TSelect extends Prisma.PieceNoteSelect> = {
  notFoundMessage?: string;
  select?: TSelect;
};

type GroupCreatorByIdGuardOptions<TSelect extends Prisma.GroupSelect> = {
  forbiddenMessage: string;
  select?: TSelect;
};

export async function requirePieceInGroup<TSelect extends Prisma.PieceSelect = typeof DEFAULT_PIECE_SELECT>(
  pieceId: string,
  groupId: string,
  options?: PieceGuardOptions<TSelect>
): Promise<Prisma.PieceGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_PIECE_SELECT) as TSelect;
  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, groupId },
    select,
  });

  if (!piece) {
    throw new Error(options?.notFoundMessage ?? "Stycke hittades inte");
  }

  return piece;
}

export async function requireSetListInGroup<
  TSelect extends Prisma.SetListSelect = typeof DEFAULT_SET_LIST_SELECT,
>(
  setListId: string,
  groupId: string,
  options?: SetListGuardOptions<TSelect>
): Promise<Prisma.SetListGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_SET_LIST_SELECT) as TSelect;
  const setList = await prisma.setList.findFirst({
    where: { id: setListId, groupId },
    select,
  });

  if (!setList) {
    throw new Error(options?.notFoundMessage ?? "Repertoar hittades inte");
  }

  return setList;
}

export async function requireSetListPieceInGroup<
  TSelect extends Prisma.SetListPieceSelect = typeof DEFAULT_SET_LIST_PIECE_SELECT,
>(
  setListPieceId: string,
  groupId: string,
  options?: SetListPieceGuardOptions<TSelect>
): Promise<Prisma.SetListPieceGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_SET_LIST_PIECE_SELECT) as TSelect;
  const setListPiece = await prisma.setListPiece.findFirst({
    where: {
      id: setListPieceId,
      setList: { groupId },
    },
    select,
  });

  if (!setListPiece) {
    throw new Error(options?.notFoundMessage ?? "Repertoarpost hittades inte");
  }

  return setListPiece;
}

export async function requireSetListPieceNoteInGroup<
  TSelect extends Prisma.SetListPieceNoteSelect = typeof DEFAULT_SET_LIST_PIECE_NOTE_SELECT,
>(
  setListPieceNoteId: string,
  groupId: string,
  options?: SetListPieceNoteGuardOptions<TSelect>
): Promise<Prisma.SetListPieceNoteGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_SET_LIST_PIECE_NOTE_SELECT) as TSelect;
  const note = await prisma.setListPieceNote.findFirst({
    where: {
      id: setListPieceNoteId,
      groupId,
      setListPiece: { setList: { groupId } },
    },
    select,
  });

  if (!note) {
    throw new Error(options?.notFoundMessage ?? "Anteckning hittades inte");
  }

  return note;
}

export async function requireFileInGroup<TSelect extends Prisma.FileSelect = typeof DEFAULT_FILE_SELECT>(
  fileId: string,
  groupId: string,
  options?: FileGuardOptions<TSelect>
): Promise<Prisma.FileGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_FILE_SELECT) as TSelect;
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      piece: { groupId },
    },
    select,
  });

  if (!file) {
    throw new Error(options?.notFoundMessage ?? "Fil hittades inte");
  }

  return file;
}

export async function requireLinkInGroup<TSelect extends Prisma.LinkSelect = typeof DEFAULT_LINK_SELECT>(
  linkId: string,
  groupId: string,
  options?: LinkGuardOptions<TSelect>
): Promise<Prisma.LinkGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_LINK_SELECT) as TSelect;
  const link = await prisma.link.findFirst({
    where: {
      id: linkId,
      piece: { groupId },
    },
    select,
  });

  if (!link) {
    throw new Error(options?.notFoundMessage ?? "Länk hittades inte");
  }

  return link;
}

export async function requirePieceNoteInGroup<
  TSelect extends Prisma.PieceNoteSelect = typeof DEFAULT_PIECE_NOTE_SELECT,
>(
  pieceNoteId: string,
  groupId: string,
  options?: PieceNoteGuardOptions<TSelect>
): Promise<Prisma.PieceNoteGetPayload<{ select: TSelect }>> {
  const select = (options?.select ?? DEFAULT_PIECE_NOTE_SELECT) as TSelect;
  const note = await prisma.pieceNote.findFirst({
    where: { id: pieceNoteId, groupId, piece: { groupId } },
    select,
  });

  if (!note) {
    throw new Error(options?.notFoundMessage ?? "Anteckning hittades inte");
  }

  return note;
}

export async function requireCreatorGroupBySlug(
  groupSlug: string,
  forbiddenMessage = "Du har inte behörighet att hantera medlemmar i gruppen"
) {
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdById: true },
  });

  if (!group || group.createdById !== userId) {
    throw new Error(forbiddenMessage);
  }

  return { userId, groupId };
}

export async function requireCreatorGroupById<
  TSelect extends Prisma.GroupSelect = typeof DEFAULT_GROUP_SELECT,
>(
  groupId: string,
  userId: string,
  options: GroupCreatorByIdGuardOptions<TSelect>
): Promise<Prisma.GroupGetPayload<{ select: TSelect }>> {
  const select = (options.select ?? DEFAULT_GROUP_SELECT) as TSelect;
  const group = await prisma.group.findFirst({
    where: { id: groupId, createdById: userId },
    select,
  });

  if (!group) {
    throw new Error(options.forbiddenMessage);
  }

  return group;
}
