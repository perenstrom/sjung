"use client";

import { CategoryHeading } from "@/components/pieces/CategoryHeading";
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
    // The item rows are taller than their text, which already spaces a
    // heading from its first item; the wider gap between groups ties each
    // heading to its own items rather than the group above.
    <div className="flex flex-col gap-3">
      {groupByCategory(files, links).map((group) => (
        <div key={group.heading ?? ""}>
          {group.heading === null ? null : (
            <CategoryHeading>{group.heading}</CategoryHeading>
          )}
          <div className="flex flex-col gap-1">
            {group.files.length > 0 ? (
              <PieceInlineFilesCell readOnly={readOnly} withoutAdd {...shared} files={group.files} />
            ) : null}
            {group.links.length > 0 ? (
              <PieceInlineLinksCell readOnly={readOnly} withoutAdd {...shared} links={group.links} />
            ) : null}
          </div>
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
