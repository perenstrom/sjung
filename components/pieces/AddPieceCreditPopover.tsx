"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addCredit } from "@/app/actions/pieces";
import { CreditRoleCombobox } from "@/components/pieces/CreditRoleCombobox";
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
import { creditRolesHeldBy, MISSING_CREDIT_FIELDS_ERROR } from "@/lib/pieces/credits";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

const NO_PEOPLE_TOOLTIP =
  "Inga upphovspersoner tillagda ännu. Lägg till upphovspersoner under Upphovspersoner först.";

export function AddPieceCreditPopover({
  groupSlug,
  people,
  creditRoles,
  piece,
}: {
  groupSlug: string;
  people: Person[];
  /** The Group's Credit roles to suggest (see `getCreditRoles`). */
  creditRoles: string[];
  piece: {
    id: string;
    name: string;
    /** Used to leave out roles the chosen Person already holds. */
    credits: PieceCredit[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPeople = people.length > 0;
  const heldRoles = creditRolesHeldBy(piece.credits, personId);

  function selectPerson(nextPersonId: string) {
    setPersonId(nextPersonId);
    // Don't leave a Credit role picked that the new Person already holds.
    if (creditRolesHeldBy(piece.credits, nextPersonId).has(role)) setRole("");
  }

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
      setError(MISSING_CREDIT_FIELDS_ERROR);
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
              <Label>Upphovsperson</Label>
              <Select value={personId} onValueChange={selectPerson}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Upphovsperson" />
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

            <div className="flex flex-wrap gap-2">
              <Label className="basis-full">Roll</Label>
              <CreditRoleCombobox
                aria-label="Roll"
                roles={creditRoles}
                heldRoles={heldRoles}
                value={role}
                onValueChange={setRole}
                className="w-full"
              />
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
