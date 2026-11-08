"use client";

import { useState } from "react";

import { AddPieceLinkPopover } from "@/components/pieces/AddPieceLinkPopover";
import { PieceLinksList } from "@/components/pieces/PieceLinksList";
import type { PieceLink } from "@/components/pieces/types";

export function PieceInlineLinksCell({
  readOnly = false,
  touch = false,
  groupSlug,
  pieceId,
  pieceName,
  links,
}: {
  readOnly?: boolean;
  /** 40px lines for touch lists; see the list's `touch`. */
  touch?: boolean;
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  links: PieceLink[];
}) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1">
        <PieceLinksList
          groupSlug={groupSlug}
          links={links}
          pieceName={pieceName}
          compact
          touch={touch}
          readOnly={readOnly}
          disabled={addPopoverOpen}
          editingLinkId={editingLinkId}
          onEditingLinkIdChange={(linkId) => {
            setEditingLinkId(linkId);
            if (linkId !== null) {
              setAddPopoverOpen(false);
            }
          }}
        />
      </div>

      {readOnly ? null : (
        <AddPieceLinkPopover
          groupSlug={groupSlug}
          pieceId={pieceId}
          pieceName={pieceName}
          open={addPopoverOpen}
          disabled={editingLinkId !== null}
          onOpenChange={(nextOpen) => {
            setAddPopoverOpen(nextOpen);
            if (nextOpen) {
              setEditingLinkId(null);
            }
          }}
        />
      )}
    </div>
  );
}
