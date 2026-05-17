export type SetListPieceStep = {
  kind: "piece";
  id: string;
  pieceId: string;
  pieceName: string;
  position: number;
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
  updatedAt: Date;
  steps: SetListStep[];
};

export type SetListPieceOption = {
  id: string;
  name: string;
};
