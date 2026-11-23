import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { playableFormatOf } from "@/lib/file-formats";

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
  files: readonly (Omit<PieceFileListItem, "playable"> & { fileName: string })[];
  links: readonly PieceLink[];
}): PieceFilesAndLinksData {
  return {
    files: piece.files.map((file) => ({
      id: file.id,
      displayName: file.displayName,
      size: file.size,
      category: file.category,
      createdAt: file.createdAt,
      playable: playableFormatOf(file) !== null,
    })),
    links: piece.links.map((link) => ({
      id: link.id,
      url: link.url,
      label: link.label,
      category: link.category,
    })),
  };
}
