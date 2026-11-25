import type { FileConversionState } from "@/app/generated/prisma/enums";
import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { playableFormatOf } from "@/lib/file-formats";
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
  files: readonly (Omit<PieceFileListItem, "playback" | "engine"> & {
    fileName: string;
    conversionState?: FileConversionState | null;
  })[];
  links: readonly PieceLink[];
}): PieceFilesAndLinksData {
  return {
    files: piece.files.map((file) => ({
      id: file.id,
      slug: file.slug,
      displayName: file.displayName,
      size: file.size,
      category: file.category,
      createdAt: file.createdAt,
      playback: playbackOf(file),
      engine: playableFormatOf(file)?.engine ?? null,
    })),
    links: piece.links.map((link) => ({
      id: link.id,
      url: link.url,
      label: link.label,
      category: link.category,
    })),
  };
}
