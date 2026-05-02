export type SetListDetail = {
  id: string;
  name: string;
  date: Date | null;
  updatedAt: Date;
  pieces: Array<{
    id: string;
    pieceId: string;
    pieceName: string;
    createdAt: Date;
  }>;
};

export type SetListPieceOption = {
  id: string;
  name: string;
};
