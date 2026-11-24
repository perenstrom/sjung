import { findInGroupOrNull } from "@/lib/find-in-group";
import { type CreditedPiece, groupCreditsByPiece } from "@/lib/pieces/credits";
import prisma from "@/lib/prisma";

/** The Group's People by name, for pickers. */
export async function getPeopleForGroup(groupId: string) {
  return prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
  });
}

export type PersonWithPieceCount = {
  id: string;
  slug: string;
  name: string;
  /** How many distinct Pieces the Person is credited on; a Piece counts once whatever their roles. */
  pieceCount: number;
};

/** The Group's People by name, each with how many Pieces they are credited on. */
export async function getPeopleWithPieceCountsForGroup(groupId: string): Promise<PersonWithPieceCount[]> {
  const people = await prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, credits: { select: { pieceId: true } } },
  });
  return people.map(({ id, slug, name, credits }) => ({
    id,
    slug,
    name,
    pieceCount: new Set(credits.map((credit) => credit.pieceId)).size,
  }));
}

export type PersonDetail = {
  id: string;
  name: string;
  /** Each Piece the Person is credited on once, by name, with their Credit roles on it. */
  pieces: CreditedPiece[];
};

/** One Person in the Group with the Pieces they are credited on, or null when not in the Group. */
export async function getPersonDetailForGroup(groupId: string, personId: string): Promise<PersonDetail | null> {
  const person = await findInGroupOrNull(groupId, "person", personId, {
    select: {
      id: true,
      name: true,
      credits: { select: { pieceId: true, role: true, piece: { select: { name: true, slug: true } } } },
    },
  });
  if (!person) return null;
  return { id: person.id, name: person.name, pieces: groupCreditsByPiece(person.credits) };
}
