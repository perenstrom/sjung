export type PieceLink = {
  id: string;
  url: string;
  label: string | null;
};

export type PieceFileListItem = {
  id: string;
  displayName: string;
  size: number;
  createdAt?: Date | string;
};
