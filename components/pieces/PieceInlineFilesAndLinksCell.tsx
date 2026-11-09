"use client";

import {
  type PieceInlineFile,
  PieceInlineFilesCell,
} from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import type { PieceLink } from "@/components/pieces/types";

/**
 * A piece's files and then its links as one stacked list, for the pieces
 * table's "Filer och länkar" column. Each list keeps its own add button and
 * row actions in edit mode; their icons tell files and links apart.
 */
export function PieceInlineFilesAndLinksCell({
  readOnly = false,
  groupSlug,
  pieceId,
  pieceName,
  files,
  links,
}: {
  readOnly?: boolean;
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceInlineFile[];
  links: PieceLink[];
}) {
  // Read-only, an empty list renders nothing, so it is left out instead of
  // leaving the gap behind.
  const showFiles = !readOnly || files.length > 0;
  const showLinks = !readOnly || links.length > 0;

  return (
    <div className="flex flex-col gap-1">
      {showFiles ? (
        <PieceInlineFilesCell
          readOnly={readOnly}
          groupSlug={groupSlug}
          pieceId={pieceId}
          pieceName={pieceName}
          files={files}
        />
      ) : null}
      {showLinks ? (
        <PieceInlineLinksCell
          readOnly={readOnly}
          groupSlug={groupSlug}
          pieceId={pieceId}
          pieceName={pieceName}
          links={links}
        />
      ) : null}
    </div>
  );
}
