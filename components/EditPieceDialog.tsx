"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeCredit, updatePiece } from "@/app/actions/pieces";
import { AddPieceCreditRow } from "@/components/pieces/AddPieceCreditRow";
import {
  PieceCreditsList,
  RemoveCreditRoleButton,
} from "@/components/pieces/PieceCreditsList";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { creditKey, type CreditForDisplay } from "@/lib/pieces/credits";
import type { Person } from "@/types/piece-credit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditPieceDialog({
  groupSlug,
  people,
  piece,
}: {
  groupSlug: string;
  people: Person[];
  piece: {
    id: string;
    name: string;
    credits: CreditForDisplay[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setError(null);
  }

  async function handleRemoveCredit(credit: CreditForDisplay) {
    setError(null);
    setRemovingKey(creditKey(credit));

    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("pieceId", piece.id);
    formData.set("personId", credit.personId);
    formData.set("role", credit.role);

    try {
      await removeCredit(formData);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort medverkande"));
    } finally {
      setRemovingKey(null);
    }
  }

  async function handleSaveName(formData: FormData) {
    try {
      await updatePiece(formData);
      setOpen(false);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte spara ändringar"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Redigera
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Redigera not</DialogTitle>
        </DialogHeader>

        <form action={handleSaveName} className="space-y-2">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={piece.id} />
          <Label htmlFor={`name-${piece.id}`}>Namn</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`name-${piece.id}`}
              name="name"
              defaultValue={piece.name}
              required
            />
            <Button type="submit">Spara</Button>
          </div>
        </form>

        <div className="space-y-3">
          <Label>Medverkande</Label>

          {piece.credits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
          ) : (
            <PieceCreditsList
              credits={piece.credits}
              className="space-y-2"
              renderRoleAction={(credit) => (
                <RemoveCreditRoleButton
                  credit={credit}
                  onRemove={handleRemoveCredit}
                  disabled={removingKey === creditKey(credit)}
                />
              )}
            />
          )}

          <div className="border-t pt-3">
            <AddPieceCreditRow
              groupSlug={groupSlug}
              pieceId={piece.id}
              people={people}
              credits={piece.credits}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
