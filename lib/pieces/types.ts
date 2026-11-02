import { Prisma } from "@/app/generated/prisma/client";

export const pieceWithRelationsInclude = {
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
  // PROTOTYPE (PER-351): Piece notes in the list view.
  notes: {
    orderBy: { updatedAt: "desc" },
    select: { id: true, content: true, updatedAt: true, createdBy: { select: { name: true } } },
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
  createdByName: PieceNoteListItemQueryResult["createdBy"]["name"];
};

export const pieceDetailSelect = {
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
  notes: {
    orderBy: { updatedAt: "desc" },
    select: pieceNoteListItemSelect,
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
} as const satisfies Prisma.PieceFindFirstArgs["select"];

type PieceDetailQueryResult = Prisma.PieceGetPayload<{
  select: typeof pieceDetailSelect;
}>;

export type PieceDetail = Omit<PieceDetailQueryResult, "notes" | "setListEntries"> & {
  notes: PieceNoteListItem[];
  setListEntries: Array<{
    id: PieceDetailQueryResult["setListEntries"][number]["id"];
    setListId: PieceDetailQueryResult["setListEntries"][number]["setListId"];
    setListName: PieceDetailQueryResult["setListEntries"][number]["setList"]["name"];
  }>;
};
