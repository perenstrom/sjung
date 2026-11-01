"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AddPieceFilePopover } from "@/components/pieces/AddPieceFilePopover";
import {
  PieceFilesList,
  type PieceFileListItem,
} from "@/components/pieces/PieceFilesList";
import { RenamePieceFilePopover } from "@/components/pieces/RenamePieceFilePopover";

export type PieceInlineFile = PieceFileListItem;

export function PieceInlineFilesCell({
  readOnly = false,
  groupSlug,
  pieceId,
  pieceName,
  files,
}: {
  readOnly?: boolean;
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceInlineFile[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1 space-y-2">
        <PieceFilesList
          groupSlug={groupSlug}
          files={files}
          showUploadedAt={false}
          compact
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
              pieceName={pieceName}
              open={editingFileId === file.id}
              disabled={addPopoverOpen || replacingFileId !== null}
              triggerClassName="size-7 shrink-0"
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
      </div>

      {readOnly ? null : (
        <AddPieceFilePopover
          groupSlug={groupSlug}
          pieceId={pieceId}
          pieceName={pieceName}
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
    </div>
  );
}
