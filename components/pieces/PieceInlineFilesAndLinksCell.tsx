"use client";

import {
  type PieceInlineFile,
  PieceInlineFilesCell,
} from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import type { PieceLink } from "@/components/pieces/types";
import { groupByCategory } from "@/lib/pieces/categories";

type PieceInlineFilesAndLinksCellProps = {
  readOnly?: boolean;
  /** 40px lines for touch lists; see the lists' `touch`. */
  touch?: boolean;
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceInlineFile[];
  links: PieceLink[];
};

/**
 * A piece's files and then its links as one stacked list, for the pieces
 * table's "Filer och länkar" column. Each list keeps its own add button and
 * row actions in edit mode; their icons tell files and links apart. When
 * anything has a Category, they are grouped under Category headings instead.
 */
export function PieceInlineFilesAndLinksCell(props: PieceInlineFilesAndLinksCellProps) {
  const groups = groupByCategory(props.files, props.links);
  if (groups === null) {
    return <FilesThenLinks {...props} />;
  }

  const { readOnly = false, touch, groupSlug, pieceId, pieceName } = props;
  const shared = { touch, groupSlug, pieceId, pieceName };
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">{group.heading}</p>
          {group.files.length > 0 ? (
            <PieceInlineFilesCell readOnly={readOnly} withoutAdd {...shared} files={group.files} />
          ) : null}
          {group.links.length > 0 ? (
            <PieceInlineLinksCell readOnly={readOnly} withoutAdd {...shared} links={group.links} />
          ) : null}
        </div>
      ))}
      {/* Empty lists render only their add buttons. */}
      {readOnly ? null : <FilesThenLinks {...shared} files={[]} links={[]} />}
    </div>
  );
}

function FilesThenLinks({
  readOnly = false,
  touch,
  groupSlug,
  pieceId,
  pieceName,
  files,
  links,
}: PieceInlineFilesAndLinksCellProps) {
  // Read-only, an empty list renders nothing, so it is left out instead of
  // leaving the gap behind.
  const showFiles = !readOnly || files.length > 0;
  const showLinks = !readOnly || links.length > 0;

  return (
    <div className="flex flex-col gap-1">
      {showFiles ? (
        <PieceInlineFilesCell
          readOnly={readOnly}
          touch={touch}
          groupSlug={groupSlug}
          pieceId={pieceId}
          pieceName={pieceName}
          files={files}
        />
      ) : null}
      {showLinks ? (
        <PieceInlineLinksCell
          readOnly={readOnly}
          touch={touch}
          groupSlug={groupSlug}
          pieceId={pieceId}
          pieceName={pieceName}
          links={links}
        />
      ) : null}
    </div>
  );
}
