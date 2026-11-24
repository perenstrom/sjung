import type { Playback } from "@/lib/pieces/playback";

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
  /**
   * Whether it is a Playable File (see CONTEXT.md) and can be played now: a
   * `ready` one opens the player instead of downloading. `null` for any other File.
   */
  playback: Playback | null;
};
