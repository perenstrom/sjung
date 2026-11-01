"use client";

import { useState } from "react";

import { useEditMode } from "@/components/EditModeContext";
import { AddPieceLinkPopover } from "@/components/pieces/AddPieceLinkPopover";
import { PieceLinksList } from "@/components/pieces/PieceLinksList";
import type { PieceLink } from "@/components/pieces/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type PieceDetailLinksSectionProps = {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  links: PieceLink[];
};

export function PieceDetailLinksSection(props: PieceDetailLinksSectionProps) {
  const { isEditing } = useEditMode();
  // Remount on every toggle so leaving edit mode closes any open popover.
  return (
    <PieceDetailLinksCard
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      {...props}
    />
  );
}

function PieceDetailLinksCard({
  readOnly,
  groupSlug,
  pieceId,
  pieceName,
  links,
}: PieceDetailLinksSectionProps & { readOnly: boolean }) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">Länkar</h2>
        {readOnly ? null : (
          <AddPieceLinkPopover
            groupSlug={groupSlug}
            pieceId={pieceId}
            pieceName={pieceName}
            triggerLabel="Lägg till länk"
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
      </CardHeader>
      <CardContent>
        <PieceLinksList
          groupSlug={groupSlug}
          links={links}
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
      </CardContent>
    </Card>
  );
}
