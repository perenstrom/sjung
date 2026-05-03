"use client";

import { useState } from "react";

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
}: {
  groupSlug: string;
  piece: Piece;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
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
          />

          <PieceLinksDialogLinks
            groupSlug={groupSlug}
            piece={piece}
            uploadsInProgress={uploading}
            onAggregateError={setError}
            onClearAggregateError={() => setError(null)}
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
