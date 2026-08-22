"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeCredit, updatePiece } from "@/app/actions/pieces";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import { getThrownMessage } from "@/lib/getThrownMessage";
import type { PieceCredit, Person } from "@/types/piece-credit-dialog";
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
import { X } from "lucide-react";

function creditKey(credit: PieceCredit): string {
  return `${credit.personId}::${credit.role}`;
}

function personName(people: Person[], personId: string): string {
  return people.find((person) => person.id === personId)?.name ?? "Okänd person";
}

export function EditPieceDialog({
  groupSlug,
  people,
  piece,
  creditsOnly = false,
}: {
  groupSlug: string;
  people: Person[];
  piece: {
    id: string;
    name: string;
    credits: PieceCredit[];
  };
  creditsOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setError(null);
  }

  async function handleRemoveCredit(credit: PieceCredit) {
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
          <DialogTitle>{creditsOnly ? "Medverkande" : "Redigera not"}</DialogTitle>
        </DialogHeader>

        {creditsOnly ? null : (
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
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Medverkande</Label>
            <AddPieceCreditPopover
              groupSlug={groupSlug}
              people={people}
              piece={{ id: piece.id, name: piece.name }}
            />
          </div>

          {piece.credits.length > 0 ? (
            <ul className="space-y-2">
              {piece.credits.map((credit) => (
                <li
                  key={creditKey(credit)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {personName(people, credit.personId)}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                    {credit.role}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={removingKey === creditKey(credit)}
                    onClick={() => handleRemoveCredit(credit)}
                    aria-label={`Ta bort ${personName(people, credit.personId)} som ${credit.role}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Inga medverkande tillagda.</p>
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {creditsOnly ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Stäng
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
