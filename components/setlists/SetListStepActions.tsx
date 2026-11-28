"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { deleteSetListNote, reorderSetListSteps, removePieceFromSetList } from "@/app/actions/setlists";
import { useEditMode } from "@/components/EditModeContext";
import { EditRunningOrderNoteButton } from "@/components/setlists/RunningOrderNote";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MANAGE_CONTENT_CAPABILITIES,
  MOVE_RUNNING_ORDER_NOTE_CAPABILITIES,
  REORDER_SET_LIST_CAPABILITIES,
  RUNNING_ORDER_NOTE_CAPABILITIES,
} from "@/lib/edit-mode";
import type { SetListStep } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";

// 32px, the height of the sm action buttons beside these in the actions cell.
// The icon variant's `pointer-coarse:size-11` still applies, so they are 44px
// on touch screens.
const ICON_BUTTON_CLASS = "size-8";

function moveStepIds(setListStepIds: string[], fromIndex: number, direction: "up" | "down"): string[] {
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
        <input type="hidden" name="orderedSetListStepIds" value={JSON.stringify(orderedSetListStepIds)} />
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

/**
 * Move up, move down and remove controls for one step of a set list, and an
 * edit control for a Running-order note. Each shows only with the capability
 * it needs: moving with `reorderSetLists`, a note's move, edit and remove with
 * `manageRunningOrderNotes`, removing a piece with `manageContent`, which
 * allows all of them.
 */
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
  const { isEditing: showsMoves } = useEditMode(
    isNote ? MOVE_RUNNING_ORDER_NOTE_CAPABILITIES : REORDER_SET_LIST_CAPABILITIES,
  );
  const { isEditing: showsEditAndRemove } = useEditMode(
    isNote ? RUNNING_ORDER_NOTE_CAPABILITIES : MANAGE_CONTENT_CAPABILITIES,
  );
  const removeLabel = isNote ? "Ta bort" : "Ta bort från repertoaren";

  return (
    <>
      {showsMoves ? (
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
        </>
      ) : null}
      {showsEditAndRemove ? (
        <>
          {isNote ? <EditRunningOrderNoteButton noteId={step.id} className={ICON_BUTTON_CLASS} /> : null}
          <Tooltip>
            <form action={isNote ? deleteSetListNote : removePieceFromSetList}>
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name={isNote ? "setListNoteId" : "setListPieceId"} value={step.id} />
              <TooltipTrigger
                type="submit"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  ICON_BUTTON_CLASS,
                  "text-destructive hover:text-destructive",
                )}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span className="sr-only">{removeLabel}</span>
              </TooltipTrigger>
            </form>
            <TooltipContent side="top">{removeLabel}</TooltipContent>
          </Tooltip>
        </>
      ) : null}
    </>
  );
}
