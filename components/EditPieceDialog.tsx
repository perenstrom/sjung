"use client";

import { useMemo, useState } from "react";
import { updatePiece } from "@/app/actions/pieces";
import { ROLES } from "@/lib/roles";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

type Person = {
  id: string;
  name: string;
};

type PieceCredit = {
  personId: string;
  role: string;
};

type CreditRow = {
  id: number;
  personId: string;
  role: string;
};

let nextId = 0;

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
    credits: PieceCredit[];
  };
}) {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initialCredits = useMemo(
    () =>
      piece.credits.map((credit) => ({
        id: nextId++,
        personId: credit.personId,
        role: credit.role,
      })),
    [piece.credits]
  );

  function addCredit() {
    setCredits((prev) => [...prev, { id: nextId++, personId: "", role: "" }]);
  }

  function removeCredit(id: number) {
    setCredits((prev) => prev.filter((credit) => credit.id !== id));
  }

  function updateCredit(id: number, field: "personId" | "role", value: string) {
    setCredits((prev) =>
      prev.map((credit) =>
        credit.id === id ? { ...credit, [field]: value } : credit
      )
    );
  }

  function resetDialogState(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setCredits(initialCredits);
      setError(null);
    }
  }

  async function handleSubmit(formData: FormData) {
    const validCredits = credits.filter(
      (credit) => credit.personId !== "" && credit.role !== ""
    );

    formData.set(
      "credits",
      JSON.stringify(
        validCredits.map((credit) => ({
          personId: credit.personId,
          role: credit.role,
        }))
      )
    );

    try {
      await updatePiece(formData);
      setOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara ändringar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetDialogState}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Redigera
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Redigera not</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-5">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={piece.id} />
          <div className="space-y-2">
            <Label htmlFor={`name-${piece.id}`}>Namn</Label>
            <Input id={`name-${piece.id}`} name="name" defaultValue={piece.name} required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medverkande</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCredit}
                disabled={people.length === 0}
              >
                Lägg till
              </Button>
            </div>

            {credits.length > 0 ? (
              <div className="space-y-2">
                {credits.map((credit) => (
                  <div key={credit.id} className="flex items-center gap-2">
                    <Select
                      value={credit.personId}
                      onValueChange={(value) =>
                        updateCredit(credit.id, "personId", value)
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Person" />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={credit.role}
                      onValueChange={(value) => updateCredit(credit.id, "role", value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Roll" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCredit(credit.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga medverkande tillagda.</p>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
