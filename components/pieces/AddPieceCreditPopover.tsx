"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updatePiece } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { ROLES } from "@/lib/roles";
import type { PieceCredit, Person } from "@/types/piece-credit-dialog";

const NO_PEOPLE_TOOLTIP =
  "Inga personer tillagda ännu. Lägg till personer under Personer först.";

export function AddPieceCreditPopover({
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPeople = people.length > 0;

  function resetForm() {
    setPersonId("");
    setRole("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  async function handleSubmit(formData: FormData) {
    if (!personId || !role) {
      setError("Välj person och roll.");
      return;
    }

    const nextCredits = [...piece.credits, { personId, role }];

    formData.set("credits", JSON.stringify(nextCredits));

    try {
      await updatePiece(formData);
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till medverkande"));
    }
  }

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      disabled={!hasPeople}
      aria-label="Lägg till medverkande"
    >
      <Plus className="size-4" aria-hidden="true" />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {hasPeople ? (
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{triggerButton}</span>
          </TooltipTrigger>
          <TooltipContent side="top">{NO_PEOPLE_TOOLTIP}</TooltipContent>
        </Tooltip>
      )}
      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Lägg till medverkande</p>
          <p className="text-sm text-muted-foreground">{piece.name}</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={piece.id} />
          <input type="hidden" name="name" value={piece.name} />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Person</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-2">
              <Label>Roll</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Roll" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((creditRole) => (
                    <SelectItem key={creditRole} value={creditRole}>
                      {creditRole}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
