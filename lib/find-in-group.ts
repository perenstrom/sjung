import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

/**
 * Each kind of Group content: how a row reaches its Group (directly, or
 * through its Piece or Set list), and what to say when it isn't there.
 */
const CONTENT = {
  piece: {
    notFound: "Stycke hittades inte",
    find: (groupId: string, id: string, select: Prisma.PieceSelect) =>
      prisma.piece.findFirst({ where: { id, groupId }, select }),
  },
  setList: {
    notFound: "Repertoar hittades inte",
    find: (groupId: string, id: string, select: Prisma.SetListSelect) =>
      prisma.setList.findFirst({ where: { id, groupId }, select }),
  },
  setListPiece: {
    notFound: "Repertoarpost hittades inte",
    find: (groupId: string, id: string, select: Prisma.SetListPieceSelect) =>
      prisma.setListPiece.findFirst({ where: { id, setList: { groupId } }, select }),
  },
  /** A Running-order note: a note step in a Set list (CONTEXT.md). */
  setListNote: {
    notFound: "Anteckning hittades inte",
    find: (groupId: string, id: string, select: Prisma.SetListNoteSelect) =>
      prisma.setListNote.findFirst({ where: { id, setList: { groupId } }, select }),
  },
  file: {
    notFound: "Fil hittades inte",
    find: (groupId: string, id: string, select: Prisma.FileSelect) =>
      prisma.file.findFirst({ where: { id, piece: { groupId } }, select }),
  },
  link: {
    notFound: "Länk hittades inte",
    find: (groupId: string, id: string, select: Prisma.LinkSelect) =>
      prisma.link.findFirst({ where: { id, piece: { groupId } }, select }),
  },
  pieceNote: {
    notFound: "Anteckning hittades inte",
    find: (groupId: string, id: string, select: Prisma.PieceNoteSelect) =>
      prisma.pieceNote.findFirst({ where: { id, groupId, piece: { groupId } }, select }),
  },
  person: {
    notFound: "Person hittades inte",
    find: (groupId: string, id: string, select: Prisma.PersonSelect) =>
      prisma.person.findFirst({ where: { id, groupId }, select }),
  },
} as const;

/** A kind of row that belongs to one Group's content. */
export type ContentKind = keyof typeof CONTENT;

type ContentSelect<K extends ContentKind> = Parameters<(typeof CONTENT)[K]["find"]>[2];

/** What `findInGroup` returns for a kind and select: the row with just the selected fields. */
type ContentRow<K extends ContentKind, S> = K extends "piece"
  ? S extends Prisma.PieceSelect ? Prisma.PieceGetPayload<{ select: S }> : never
  : K extends "setList"
    ? S extends Prisma.SetListSelect ? Prisma.SetListGetPayload<{ select: S }> : never
    : K extends "setListPiece"
      ? S extends Prisma.SetListPieceSelect ? Prisma.SetListPieceGetPayload<{ select: S }> : never
      : K extends "setListNote"
        ? S extends Prisma.SetListNoteSelect ? Prisma.SetListNoteGetPayload<{ select: S }> : never
        : K extends "file"
          ? S extends Prisma.FileSelect ? Prisma.FileGetPayload<{ select: S }> : never
          : K extends "link"
            ? S extends Prisma.LinkSelect ? Prisma.LinkGetPayload<{ select: S }> : never
            : K extends "pieceNote"
              ? S extends Prisma.PieceNoteSelect ? Prisma.PieceNoteGetPayload<{ select: S }> : never
              : S extends Prisma.PersonSelect ? Prisma.PersonGetPayload<{ select: S }> : never;

const ID_ONLY = { id: true } as const;

/**
 * The row of this kind with this id, if it belongs to the Group. Throws a
 * Swedish "hittades inte" message when it is missing or in another Group, so
 * one Group can never reach another's content. Selects only `id` unless told
 * otherwise.
 */
export async function findInGroup<
  K extends ContentKind,
  S extends ContentSelect<K> = typeof ID_ONLY,
>(groupId: string, kind: K, id: string, options?: { select?: S }): Promise<ContentRow<K, S>> {
  const { find, notFound } = CONTENT[kind];
  const select = options?.select ?? ID_ONLY;
  // Each entry's `find` takes its own model's select; the union can't be called directly.
  const row = await (find as (groupId: string, id: string, select: object) => Promise<unknown>)(
    groupId,
    id,
    select
  );
  if (!row) {
    throw new Error(notFound);
  }
  return row as ContentRow<K, S>;
}
