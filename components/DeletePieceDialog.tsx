"use client";

import { useState } from "react";
import { deletePiece } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeletePieceDialog({
  groupSlug,
  piece,
}: {
  groupSlug: string;
  piece: {
    id: string;
    name: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await deletePiece(formData);
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ta bort not");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Ta bort
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort not?</DialogTitle>
          <DialogDescription>
            <strong>{piece.name}</strong> tas bort permanent tillsammans med tillhörande
            filer, länkar och medverkande. Detta går inte att ångra.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={piece.id} />
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" variant="destructive">
              Ta bort
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
