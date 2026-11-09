import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import type { PieceWithRelations } from "@/lib/pieces/types";

/** A piece's files, as the inline file lists take them. */
export function toInlineFiles(piece: PieceWithRelations): PieceFileListItem[] {
  return piece.files.map((file) => ({
    id: file.id,
    displayName: file.displayName,
    size: file.size,
  }));
}

/** A piece's links, as the inline link lists take them. */
export function toInlineLinks(piece: PieceWithRelations): PieceLink[] {
  return piece.links.map((link) => ({ id: link.id, url: link.url, label: link.label }));
}
