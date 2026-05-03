"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PieceFilesList } from "./PieceFilesList";
import type { Piece } from "./types";
import { usePieceFileUpload } from "./usePieceFileUpload";

export function PieceLinksDialogFiles({
  groupSlug,
  piece,
  dialogOpen,
  onAggregateError,
  onClearAggregateError,
  onUploadingChange,
  onMutationSuccess,
}: {
  groupSlug: string;
  piece: Pick<Piece, "id" | "name" | "files">;
  dialogOpen: boolean;
  onAggregateError: (message: string) => void;
  onClearAggregateError: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  onMutationSuccess?: () => void;
}) {
  const { handleUpload, isUploading } = usePieceFileUpload({
    groupSlug,
    pieceId: piece.id,
    onError: onAggregateError,
    onClearError: onClearAggregateError,
    onUploadingChange,
    onUploadSuccess: onMutationSuccess,
  });

  return (
    <div className="space-y-3 rounded border p-3">
      <h3 className="text-sm font-medium">Filer</h3>
      <form action={handleUpload} className="space-y-3">
        <input type="hidden" name="groupSlug" value={groupSlug} />
        <input type="hidden" name="pieceId" value={piece.id} />
        <div className="space-y-2">
          <Label htmlFor={`file-${piece.id}`}>Välj fil</Label>
          <Input
            id={`file-${piece.id}`}
            name="file"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
            required
            disabled={isUploading}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isUploading}>
            {isUploading ? "Laddar upp..." : "Ladda upp fil"}
          </Button>
        </div>
      </form>

      <PieceFilesList
        groupSlug={groupSlug}
        files={piece.files}
        showUploadedAt={false}
        dialogOpen={dialogOpen}
        onAggregateError={onAggregateError}
        onClearAggregateError={onClearAggregateError}
        onMutationSuccess={onMutationSuccess}
      />
    </div>
  );
}
