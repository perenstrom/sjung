"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  deleteSetListNote,
  reorderSetListSteps,
  removePieceFromSetList,
} from "@/app/actions/setlists";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SetListStep } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";

// 32px, the height of the sm action buttons beside these in the actions cell.
const ICON_BUTTON_CLASS = "size-8";

function moveStepIds(
  setListStepIds: string[],
  fromIndex: number,
  direction: "up" | "down"
): string[] {
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= setListStepIds.length) {
    return setListStepIds;
  }
  const next = [...setListStepIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function MoveStepButton({
  label,
  icon,
  orderedSetListStepIds,
  disabled,
  groupSlug,
  setListId,
}: {
  label: string;
  icon: ReactNode;
  orderedSetListStepIds: string[];
  disabled: boolean;
  groupSlug: string;
  setListId: string;
}) {
  return (
    <Tooltip>
      <form action={reorderSetListSteps}>
        <input type="hidden" name="groupSlug" value={groupSlug} />
        <input type="hidden" name="setListId" value={setListId} />
        <input
          type="hidden"
          name="orderedSetListStepIds"
          value={JSON.stringify(orderedSetListStepIds)}
        />
        <TooltipTrigger
          type="submit"
          disabled={disabled}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), ICON_BUTTON_CLASS)}
        >
          {icon}
          <span className="sr-only">{label}</span>
        </TooltipTrigger>
      </form>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Move up, move down and remove controls for one step of a set list. */
export function SetListStepActions({
  step,
  stepIndex,
  orderedStepIds,
  groupSlug,
  setListId,
}: {
  step: Pick<SetListStep, "kind" | "id">;
  stepIndex: number;
  orderedStepIds: string[];
  groupSlug: string;
  setListId: string;
}) {
  const isNote = step.kind === "note";
  const removeLabel = isNote ? "Ta bort" : "Ta bort från repertoaren";

  return (
    <>
      <MoveStepButton
        label="Flytta upp"
        icon={<ChevronUp className="size-4" aria-hidden="true" />}
        orderedSetListStepIds={moveStepIds(orderedStepIds, stepIndex, "up")}
        disabled={stepIndex === 0}
        groupSlug={groupSlug}
        setListId={setListId}
      />
      <MoveStepButton
        label="Flytta ner"
        icon={<ChevronDown className="size-4" aria-hidden="true" />}
        orderedSetListStepIds={moveStepIds(orderedStepIds, stepIndex, "down")}
        disabled={stepIndex === orderedStepIds.length - 1}
        groupSlug={groupSlug}
        setListId={setListId}
      />
      <Tooltip>
        <form action={isNote ? deleteSetListNote : removePieceFromSetList}>
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input
            type="hidden"
            name={isNote ? "setListNoteId" : "setListPieceId"}
            value={step.id}
          />
          <TooltipTrigger
            type="submit"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              ICON_BUTTON_CLASS,
              "text-destructive hover:text-destructive"
            )}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="sr-only">{removeLabel}</span>
          </TooltipTrigger>
        </form>
        <TooltipContent side="top">{removeLabel}</TooltipContent>
      </Tooltip>
    </>
  );
}
