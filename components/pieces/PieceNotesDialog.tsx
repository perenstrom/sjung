"use client";

import { useState } from "react";

import {
  PieceNotesPanel,
  usePieceNotes,
} from "@/components/pieces/PieceNotesPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PieceNotesDialog({
  readOnly = false,
  groupSlug,
  piece,
}: {
  /** Notes can still be read, but not added, edited or deleted. */
  readOnly?: boolean;
  groupSlug: string;
  piece: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const list = usePieceNotes(groupSlug, piece.id);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void list.reload();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Anteckningar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anteckningar för {piece.name}</DialogTitle>
        </DialogHeader>

        {/* DialogContent unmounts while closed, so reopening discards drafts and open inline edits. */}
        <PieceNotesPanel
          readOnly={readOnly}
          groupSlug={groupSlug}
          pieceId={piece.id}
          list={list}
          listClassName="max-h-[50vh] overflow-y-auto"
        />
      </DialogContent>
    </Dialog>
  );
}
