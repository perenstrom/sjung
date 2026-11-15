"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  PieceNotesPanel,
  usePieceNotes,
} from "@/components/pieces/PieceNotesPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Adds, edits and deletes a piece's Piece notes from the pieces list, behind a
 * link-styled trigger. The list shows the change once the dialog closes.
 */
export function PieceNotesDialog({
  groupSlug,
  piece,
  hasNotes,
  triggerClassName,
}: {
  groupSlug: string;
  piece: { id: string; name: string };
  /** Picks the trigger's text: edit the notes, or add the first one. */
  hasNotes: boolean;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const list = usePieceNotes(groupSlug, piece.id);
  const notesChanged = useRef(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void list.reload();
    } else if (notesChanged.current) {
      // Note mutations don't revalidate (see app/actions/pieces.ts), so the
      // list refreshes itself. Waiting until close keeps the open dialog as is.
      notesChanged.current = false;
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm underline underline-offset-4 outline-none focus-visible:ring-[3px]",
            triggerClassName
          )}
        >
          {hasNotes ? "Redigera anteckningar" : "Lägg till anteckning"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anteckningar för {piece.name}</DialogTitle>
        </DialogHeader>

        {/* DialogContent unmounts while closed, so reopening discards drafts and open inline edits. */}
        <PieceNotesPanel
          readOnly={false}
          groupSlug={groupSlug}
          pieceId={piece.id}
          list={list}
          listClassName="max-h-[50vh] overflow-y-auto"
          onMutationSuccess={() => {
            notesChanged.current = true;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
