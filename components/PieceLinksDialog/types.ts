export type PieceLink = {
  id: string;
  url: string;
  label: string | null;
};

export type PieceFile = {
  id: string;
  displayName: string;
  size: number;
};

export type Piece = {
  id: string;
  name: string;
  files: PieceFile[];
  links: PieceLink[];
};
