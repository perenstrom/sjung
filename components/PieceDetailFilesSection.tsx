"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useEditMode } from "@/components/EditModeContext";
import { AddPieceFileRow } from "@/components/pieces/AddPieceFileRow";
import { PieceDetailSectionLayout } from "@/components/pieces/PieceDetailSectionLayout";
import { PieceFilesList } from "@/components/pieces/PieceFilesList";
import { RenamePieceFilePopover } from "@/components/pieces/RenamePieceFilePopover";
import type { PieceFileListItem } from "@/components/pieces/types";

type PieceDetailFilesSectionProps = {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceFileListItem[];
};

export function PieceDetailFilesSection(props: PieceDetailFilesSectionProps) {
  const { isEditing } = useEditMode();
  // Remount on every toggle so leaving edit mode closes any open popover.
  return (
    <PieceDetailFilesBody
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      {...props}
    />
  );
}

function PieceDetailFilesBody({
  readOnly,
  groupSlug,
  pieceId,
  files,
}: PieceDetailFilesSectionProps & { readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  return (
    <PieceDetailSectionLayout title="Filer">
      <PieceFilesList
        groupSlug={groupSlug}
        files={files}
        readOnly={readOnly}
        onAggregateError={setError}
        onClearAggregateError={() => setError(null)}
        onMutationSuccess={() => router.refresh()}
        renderFileActions={(file) => (
          <RenamePieceFilePopover
            key={file.id}
            groupSlug={groupSlug}
            fileId={file.id}
            displayName={file.displayName}
            category={file.category}
            open={editingFileId === file.id}
            triggerClassName="size-7 shrink-0"
            onOpenChange={(nextOpen) => {
              if (nextOpen) {
                setEditingFileId(file.id);
              } else if (editingFileId === file.id) {
                setEditingFileId(null);
              }
            }}
          />
        )}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {readOnly ? null : (
        <div className="border-t pt-3">
          <AddPieceFileRow groupSlug={groupSlug} pieceId={pieceId} />
        </div>
      )}
    </PieceDetailSectionLayout>
  );
}
