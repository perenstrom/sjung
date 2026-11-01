"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useEditMode } from "@/components/EditModeContext";
import { AddPieceFilePopover } from "@/components/pieces/AddPieceFilePopover";
import {
  PieceFilesList,
  type PieceFileListItem,
} from "@/components/pieces/PieceFilesList";
import { RenamePieceFilePopover } from "@/components/pieces/RenamePieceFilePopover";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <PieceDetailFilesCard
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      {...props}
    />
  );
}

function PieceDetailFilesCard({
  readOnly,
  groupSlug,
  pieceId,
  pieceName,
  files,
}: PieceDetailFilesSectionProps & { readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">Filer</h2>
        {readOnly ? null : (
          <AddPieceFilePopover
            groupSlug={groupSlug}
            pieceId={pieceId}
            pieceName={pieceName}
            triggerLabel="Ladda upp fil"
            open={addPopoverOpen}
            disabled={editingFileId !== null || replacingFileId !== null}
            onOpenChange={(nextOpen) => {
              setAddPopoverOpen(nextOpen);
              if (nextOpen) {
                setEditingFileId(null);
                setReplacingFileId(null);
              }
            }}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <PieceFilesList
          groupSlug={groupSlug}
          files={files}
          showUploadedAt
          readOnly={readOnly}
          onAggregateError={setError}
          onClearAggregateError={() => setError(null)}
          onMutationSuccess={() => router.refresh()}
          disabled={
            addPopoverOpen || editingFileId !== null || replacingFileId !== null
          }
          replacingFileId={replacingFileId}
          onReplacingFileIdChange={(fileId) => {
            setReplacingFileId(fileId);
            if (fileId !== null) {
              setAddPopoverOpen(false);
              setEditingFileId(null);
            }
          }}
          renderFileActions={(file) => (
            <RenamePieceFilePopover
              key={file.id}
              groupSlug={groupSlug}
              fileId={file.id}
              displayName={file.displayName}
              open={editingFileId === file.id}
              disabled={addPopoverOpen || replacingFileId !== null}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  setAddPopoverOpen(false);
                  setReplacingFileId(null);
                  setEditingFileId(file.id);
                } else if (editingFileId === file.id) {
                  setEditingFileId(null);
                }
              }}
            />
          )}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
