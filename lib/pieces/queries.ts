import prisma from "@/lib/prisma";
import {
  pieceDetailSelect,
  pieceWithRelationsInclude,
  type PieceDetail,
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
    credits: piece.credits.sort((a, b) => {
      const byName = a.person.name.localeCompare(b.person.name, "sv-SE");
      if (byName !== 0) {
        return byName;
      }
      return a.role.localeCompare(b.role, "sv-SE");
    }),
    files: piece.files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    links: piece.links.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    setListEntries: piece.setListEntries
      .map((entry) => ({
        id: entry.id,
        setListId: entry.setListId,
        setListName: entry.setList.name,
      }))
      .sort((a, b) => a.setListName.localeCompare(b.setListName, "sv-SE")),
  };
}
