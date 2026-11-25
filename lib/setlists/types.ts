import type { PieceWithRelations } from "@/lib/pieces/types";

export type SetListPieceStep = {
  kind: "piece";
  id: string;
  pieceId: string;
  piece: PieceWithRelations;
  position: number;
  /** The Piece's Files and Links Hidden on this Set list piece (CONTEXT.md, "Hidden"). */
  hiddenFileIds: string[];
  hiddenLinkIds: string[];
};

export type SetListNoteStep = {
  kind: "note";
  id: string;
  content: string;
  position: number;
};

export type SetListStep = SetListPieceStep | SetListNoteStep;

export type SetListDetail = {
  id: string;
  name: string;
  date: Date | null;
  current: boolean;
  updatedAt: Date;
  steps: SetListStep[];
};

/** A Set list piece as a Piece's page opened from it sees it: where it leads back to, and what it hides. */
export type SetListPieceContext = {
  id: string;
  setList: { id: string; slug: string; name: string };
  hiddenFileIds: string[];
  hiddenLinkIds: string[];
};

export type SetListPieceOption = {
  id: string;
  name: string;
  /** In the order they were added; the picker finds a Piece by them too. */
  aliases: { name: string }[];
};

/** A step's identity and position, stripped of display fields — the unit `SetListSequence` operates on. */
export type SetListSequenceStep = {
  kind: "piece" | "note";
  id: string;
  position: number;
};
