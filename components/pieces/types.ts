export type PieceLink = {
  id: string;
  url: string;
  label: string | null;
  /** See Category in CONTEXT.md; `null` is uncategorized. */
  category: string | null;
};

export type PieceFileListItem = {
  id: string;
  displayName: string;
  size: number;
  /** See Category in CONTEXT.md; `null` is uncategorized. */
  category: string | null;
  createdAt?: Date | string;
};
