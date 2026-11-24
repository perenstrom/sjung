"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { AddPieceCreditRow } from "@/components/pieces/AddPieceCreditRow";
import { Button } from "@/components/ui/button";
import { FormPopover, FormPopoverContent, FormPopoverTrigger } from "@/components/ui/form-popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

const NO_PEOPLE_TOOLTIP = "Inga upphovspersoner tillagda ännu. Lägg till upphovspersoner under Upphovspersoner först.";

/** The "+" in a Pieces list row: the add-credit row in a popover, closed once the Credits are saved. */
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
    /** Used to lock roles the chosen Person already holds. */
    credits: PieceCredit[];
  };
}) {
  const [open, setOpen] = useState(false);
  const hasPeople = people.length > 0;

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      disabled={!hasPeople}
      aria-label="Lägg till upphovsperson"
    >
      <Plus className="size-4" aria-hidden="true" />
    </Button>
  );

  return (
    // The row's draft lives in the content, so closing the popover discards it.
    <FormPopover open={open} onOpenChange={setOpen}>
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
      <FormPopoverContent title="Lägg till upphovsperson" description={piece.name}>
        <AddPieceCreditRow
          groupSlug={groupSlug}
          pieceId={piece.id}
          people={people}
          creditRoles={creditRoles}
          credits={piece.credits}
          onAdded={() => setOpen(false)}
        />
      </FormPopoverContent>
    </FormPopover>
  );
}
