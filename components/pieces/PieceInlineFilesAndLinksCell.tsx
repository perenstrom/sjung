"use client";

import {
  type PieceInlineFile,
  PieceInlineFilesCell,
} from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import type { PieceLink } from "@/components/pieces/types";
import { groupByCategory } from "@/lib/pieces/categories";

/**
 * A piece's Files and Links as one list under their Category headings (see
 * `groupByCategory`), Files before Links in each; their icons tell them
 * apart. In edit mode, the add buttons for both come last.
 */
export function PieceInlineFilesAndLinksCell({
  readOnly = false,
  touch,
  groupSlug,
  pieceId,
  pieceName,
  files,
  links,
}: {
  readOnly?: boolean;
  /** 40px lines for touch lists; see the lists' `touch`. */
  touch?: boolean;
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceInlineFile[];
  links: PieceLink[];
}) {
  const shared = { touch, groupSlug, pieceId, pieceName };

  return (
    <div className="flex flex-col gap-2">
      {groupByCategory(files, links).map((group) => (
        <div key={group.heading ?? ""} className="flex flex-col gap-1">
          {group.heading === null ? null : (
            <p className="text-xs font-medium text-muted-foreground">{group.heading}</p>
          )}
          {group.files.length > 0 ? (
            <PieceInlineFilesCell readOnly={readOnly} withoutAdd {...shared} files={group.files} />
          ) : null}
          {group.links.length > 0 ? (
            <PieceInlineLinksCell readOnly={readOnly} withoutAdd {...shared} links={group.links} />
          ) : null}
        </div>
      ))}
      {readOnly ? null : (
        // Empty lists render only their add buttons.
        <div className="flex flex-col gap-1">
          <PieceInlineFilesCell {...shared} files={[]} />
          <PieceInlineLinksCell {...shared} links={[]} />
        </div>
      )}
    </div>
  );
}
