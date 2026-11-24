import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { playbackOf } from "@/lib/pieces/playback";

export type PieceFilesAndLinksData = {
  files: PieceFileListItem[];
  links: PieceLink[];
};

/**
 * A Piece's Files and Links as `PieceFilesAndLinks` takes them. Picks each
 * field by name: whatever a client component is given is sent to the browser,
 * so a File's storage key and audit columns must not come along.
 */
export function toPieceFilesAndLinks(piece: {
  files: readonly (Omit<PieceFileListItem, "playback"> & {
    fileName: string;
    conversionState?: Parameters<typeof playbackOf>[0]["conversionState"];
  })[];
  links: readonly PieceLink[];
}): PieceFilesAndLinksData {
  return {
    files: piece.files.map((file) => ({
      id: file.id,
      displayName: file.displayName,
      size: file.size,
      category: file.category,
      createdAt: file.createdAt,
      playback: playbackOf(file),
    })),
    links: piece.links.map((link) => ({
      id: link.id,
      url: link.url,
      label: link.label,
      category: link.category,
    })),
  };
}
