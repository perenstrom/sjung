import prisma from "@/lib/prisma";
import type { PieceDetail, PieceWithRelations } from "@/lib/pieces/types";

export async function getPiecesForGroup(groupId: string): Promise<PieceWithRelations[]> {
  return prisma.piece.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
    include: {
      credits: {
        include: {
          person: { select: { name: true } },
        },
      },
      files: {
        orderBy: { createdAt: "desc" },
      },
      links: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getPieceDetailForGroup(groupId: string, pieceId: string): Promise<PieceDetail | null> {
  const piece = await prisma.piece.findFirst({
    where: {
      id: pieceId,
      groupId,
    },
    select: {
      id: true,
      name: true,
      credits: {
        select: {
          personId: true,
          role: true,
          person: {
            select: {
              name: true,
            },
          },
        },
      },
      files: {
        select: {
          id: true,
          createdAt: true,
          displayName: true,
          fileName: true,
          mimeType: true,
          size: true,
        },
      },
      links: {
        select: {
          id: true,
          createdAt: true,
          url: true,
          label: true,
        },
      },
      setListEntries: {
        select: {
          id: true,
          setListId: true,
          setList: {
            select: {
              name: true,
            },
          },
        },
      },
    },
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
