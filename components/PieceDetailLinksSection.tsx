"use client";

import { useState } from "react";

import { useEditMode } from "@/components/EditModeContext";
import { AddPieceLinkRow } from "@/components/pieces/AddPieceLinkRow";
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
  // Remount on every toggle so leaving edit mode discards a half-filled add row
  // and closes any open popover.
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
  links,
}: PieceDetailLinksSectionProps & { readOnly: boolean }) {
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">Länkar</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <PieceLinksList
          groupSlug={groupSlug}
          links={links}
          readOnly={readOnly}
          editingLinkId={editingLinkId}
          onEditingLinkIdChange={setEditingLinkId}
        />

        {readOnly ? null : (
          <div className="border-t pt-3">
            <AddPieceLinkRow groupSlug={groupSlug} pieceId={pieceId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
