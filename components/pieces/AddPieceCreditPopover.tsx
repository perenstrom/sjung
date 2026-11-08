"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addCredit } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FormPopover,
  FormPopoverContent,
  FormPopoverFooter,
  FormPopoverTrigger,
} from "@/components/ui/form-popover";
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
import type { Person } from "@/types/piece-credit-dialog";

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

    try {
      await addCredit(formData);
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
    <FormPopover open={open} onOpenChange={handleOpenChange}>
      {hasPeople ? (
        <FormPopoverTrigger asChild>{triggerButton}</FormPopoverTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{triggerButton}</span>
          </TooltipTrigger>
          <TooltipContent side="top">{NO_PEOPLE_TOOLTIP}</TooltipContent>
        </Tooltip>
      )}
      <FormPopoverContent
        title="Lägg till medverkande"
        description={piece.name}
      >
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={piece.id} />
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="role" value={role} />

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

          <FormPopoverFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit">Spara</Button>
          </FormPopoverFooter>
        </form>
      </FormPopoverContent>
    </FormPopover>
  );
}
