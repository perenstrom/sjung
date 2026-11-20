import { Prisma } from "@/app/generated/prisma/client";

/** Aliases in the order they were added; the id breaks a tie between two added in the same millisecond. */
export const PIECE_ALIAS_ORDER = [
  { createdAt: "asc" },
  { id: "asc" },
] as const satisfies Prisma.PieceAliasOrderByWithRelationInput[];

/** A Piece's Aliases as lists and pages show them, in the order they were added (CONTEXT.md: Alias). */
const pieceAliasesQuery = {
  orderBy: PIECE_ALIAS_ORDER,
  select: { id: true, name: true },
} as const satisfies Prisma.Piece$aliasesArgs;

/** One of a Piece's Aliases. */
export type PieceAliasItem = Prisma.PieceAliasGetPayload<{ select: typeof pieceAliasesQuery.select }>;

export const pieceWithRelationsInclude = {
  aliases: pieceAliasesQuery,
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
  // Text only: the list shows no author or date, those stay on piece detail.
  notes: {
    orderBy: { updatedAt: "desc" },
    select: { id: true, content: true },
  },
} as const satisfies Prisma.PieceFindManyArgs["include"];

export type PieceWithRelations = Prisma.PieceGetPayload<{
  include: typeof pieceWithRelationsInclude;
}>;

export const pieceNoteListItemSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  createdBy: { select: { name: true } },
} as const satisfies Prisma.PieceNoteSelect;

export type PieceNoteListItemQueryResult = Prisma.PieceNoteGetPayload<{
  select: typeof pieceNoteListItemSelect;
}>;

export type PieceNoteListItem = Omit<PieceNoteListItemQueryResult, "createdBy"> & {
  /** `null` once the author has deleted their account; show it with `authorName`. */
  createdByName: string | null;
};

export const pieceDetailSelect = {
  id: true,
  name: true,
  aliases: pieceAliasesQuery,
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
      size: true,
      category: true,
    },
  },
  links: {
    select: {
      id: true,
      createdAt: true,
      url: true,
      label: true,
      category: true,
    },
  },
  notes: {
    orderBy: { updatedAt: "desc" },
    select: pieceNoteListItemSelect,
  },
  setListEntries: {
    select: {
      setListId: true,
      setList: {
        select: {
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.PieceFindFirstArgs["select"];

export type PieceDetailQueryResult = Prisma.PieceGetPayload<{
  select: typeof pieceDetailSelect;
}>;

/** A Set list the Piece is in, however many times it appears there. */
export type PieceSetList = {
  setListId: string;
  setListName: string;
};

export type PieceDetail = Omit<PieceDetailQueryResult, "notes" | "setListEntries"> & {
  notes: PieceNoteListItem[];
  /** One per Set list the Piece is in, sorted by Set list name. */
  setLists: PieceSetList[];
};
