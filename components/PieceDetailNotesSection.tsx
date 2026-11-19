"use client";

import { useEditMode } from "@/components/EditModeContext";
import { PieceDetailSectionLayout } from "@/components/pieces/PieceDetailSectionLayout";
import {
  PieceNotesPanel,
  usePieceNotes,
  type PieceNotesState,
} from "@/components/pieces/PieceNotesPanel";
import type { PieceNoteListItem } from "@/lib/pieces/types";

type PieceDetailNotesSectionProps = {
  groupSlug: string;
  pieceId: string;
  notes: PieceNoteListItem[];
};

export function PieceDetailNotesSection({
  groupSlug,
  pieceId,
  notes,
}: PieceDetailNotesSectionProps) {
  const { isEditing } = useEditMode();
  // Note mutations don't revalidate the page, so the list is held here, above the
  // remount, to keep client-side changes when edit mode is toggled.
  const list = usePieceNotes(groupSlug, pieceId, notes);
  // Remount on every toggle so leaving edit mode discards a half-written note
  // and closes any open inline edit.
  return (
    <PieceDetailNotesBody
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      groupSlug={groupSlug}
      pieceId={pieceId}
      list={list}
    />
  );
}

function PieceDetailNotesBody({
  readOnly,
  groupSlug,
  pieceId,
  list,
}: {
  readOnly: boolean;
  groupSlug: string;
  pieceId: string;
  list: PieceNotesState;
}) {
  return (
    <PieceDetailSectionLayout title="Anteckningar">
      <PieceNotesPanel
        readOnly={readOnly}
        groupSlug={groupSlug}
        pieceId={pieceId}
        list={list}
      />
    </PieceDetailSectionLayout>
  );
}
