import prisma from "@/lib/prisma";
import {
  pieceDetailSelect,
  pieceWithRelationsInclude,
  type PieceDetail,
  type PieceNoteListItem,
  type PieceNoteListItemQueryResult,
  type PieceWithRelations,
} from "@/lib/pieces/types";

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
    credits: piece.credits,
    files: piece.files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    links: piece.links.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    notes: piece.notes.map(toPieceNoteListItem),
    setListEntries: piece.setListEntries
      .map((entry) => ({
        id: entry.id,
        setListId: entry.setListId,
        setListName: entry.setList.name,
      }))
      .sort((a, b) => a.setListName.localeCompare(b.setListName, "sv-SE")),
  };
}

export function toPieceNoteListItem({
  createdBy,
  ...note
}: PieceNoteListItemQueryResult): PieceNoteListItem {
  return { ...note, createdByName: createdBy.name };
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
