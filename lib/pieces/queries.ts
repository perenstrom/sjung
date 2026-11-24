import prisma from "@/lib/prisma";
import {
  pieceDetailSelect,
  pieceWithRelationsInclude,
  type PieceDetail,
  type PieceDetailQueryResult,
  type PieceNoteListItem,
  type PieceNoteListItemQueryResult,
  type PieceSetList,
  type PieceWithRelations,
} from "@/lib/pieces/types";
import type { ImportGroup } from "@/lib/pieces/import";
import { resolveCategory } from "@/lib/pieces/categories";

export async function getPiecesForGroup(groupId: string): Promise<PieceWithRelations[]> {
  return prisma.piece.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
    include: pieceWithRelationsInclude,
  });
}

export async function getPieceDetailForGroup(groupId: string, pieceId: string): Promise<PieceDetail | null> {
  const piece = await prisma.piece.findFirst({
    where: {
      id: pieceId,
      groupId,
    },
    select: pieceDetailSelect,
  });

  if (!piece) {
    return null;
  }

  return {
    id: piece.id,
    name: piece.name,
    aliases: piece.aliases,
    credits: piece.credits,
    files: piece.files,
    links: piece.links,
    notes: piece.notes.map(toPieceNoteListItem),
    setLists: toPieceSetLists(piece.setListEntries),
  };
}

/** One entry per Set list the Piece is in, however many times it appears there, by name. */
function toPieceSetLists(setListPieces: PieceDetailQueryResult["setListEntries"]): PieceSetList[] {
  const bySetList = new Map(
    setListPieces.map((entry) => [entry.setListId, { setListId: entry.setListId, setListName: entry.setList.name }]),
  );
  return [...bySetList.values()].sort((a, b) => a.setListName.localeCompare(b.setListName, "sv-SE"));
}

export function toPieceNoteListItem({ createdBy, ...note }: PieceNoteListItemQueryResult): PieceNoteListItem {
  return { ...note, createdByName: createdBy?.name ?? null };
}

/** Distinct ids of the set lists that contain the piece at least once. */
export async function getSetListIdsContainingPiece(pieceId: string): Promise<string[]> {
  const entries = await prisma.setListPiece.findMany({
    where: { pieceId },
    distinct: ["setListId"],
    select: { setListId: true },
  });
  return entries.map((entry) => entry.setListId);
}

/** The distinct Credit roles on the Group's credits, as stored. */
export async function getCreditRolesUsedInGroup(
  groupId: string,
  db: Pick<typeof prisma, "personToPiece"> = prisma,
): Promise<string[]> {
  const credits = await db.personToPiece.findMany({
    where: { piece: { groupId } },
    distinct: ["role"],
    select: { role: true },
  });
  return credits.map((credit) => credit.role);
}

/** The distinct Categories on the Group's Files and Links, as stored. */
export async function getCategoriesUsedInGroup(groupId: string): Promise<string[]> {
  const where = { piece: { groupId }, category: { not: null } };
  const [files, links] = await Promise.all([
    prisma.file.findMany({ where, distinct: ["category"], select: { category: true } }),
    prisma.link.findMany({ where, distinct: ["category"], select: { category: true } }),
  ]);
  return [...files, ...links].flatMap(({ category }) => (category === null ? [] : [category]));
}

/** The Category to store in the Group for a typed one (see `resolveCategory`). */
export async function resolveCategoryInGroup(groupId: string, typed: string): Promise<string | null> {
  return typed.trim() === "" ? null : resolveCategory(typed, await getCategoriesUsedInGroup(groupId));
}

/** What a Piece import matches against: the Group's People, Credit roles in use and Piece titles. */
export async function getPieceImportGroupFor(
  groupId: string,
  db: Pick<typeof prisma, "person" | "personToPiece" | "piece"> = prisma,
): Promise<ImportGroup> {
  const [people, creditRoles, pieces] = await Promise.all([
    db.person.findMany({
      where: { groupId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    getCreditRolesUsedInGroup(groupId, db),
    db.piece.findMany({ where: { groupId }, select: { name: true } }),
  ]);
  return { people, creditRoles, pieceTitles: pieces.map((piece) => piece.name) };
}
