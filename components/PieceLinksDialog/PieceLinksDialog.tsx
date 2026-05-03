"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PieceLinksDialogFiles } from "./PieceLinksDialogFiles";
import { PieceLinksDialogLinks } from "./PieceLinksDialogLinks";
import type { Piece } from "./types";

export function PieceLinksDialog({
  groupSlug,
  piece,
  refreshAfterMutations = false,
}: {
  groupSlug: string;
  piece: Piece;
  refreshAfterMutations?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleMutationSuccess = useCallback(() => {
    if (refreshAfterMutations) {
      router.refresh();
    }
  }, [refreshAfterMutations, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setUploading(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Länkar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Länkar och filer för {piece.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <PieceLinksDialogFiles
            groupSlug={groupSlug}
            piece={piece}
            dialogOpen={open}
            onAggregateError={setError}
            onClearAggregateError={() => setError(null)}
            onUploadingChange={setUploading}
            onMutationSuccess={handleMutationSuccess}
          />

          <PieceLinksDialogLinks
            groupSlug={groupSlug}
            piece={piece}
            uploadsInProgress={uploading}
            onAggregateError={setError}
            onClearAggregateError={() => setError(null)}
            onMutationSuccess={handleMutationSuccess}
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
