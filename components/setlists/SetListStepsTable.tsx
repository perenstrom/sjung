"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import {
  deleteSetListNote,
  reorderSetListSteps,
  removePieceFromSetList,
} from "@/app/actions/setlists";
import { DataTable } from "@/components/data-table";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SetListStep } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";

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

export function SetListStepsTable({
  steps,
  groupSlug,
  setListId,
}: {
  steps: SetListStep[];
  groupSlug: string;
  setListId: string;
}) {
  const orderedStepIds = useMemo(() => steps.map((step) => step.id), [steps]);

  const columns = useMemo<ColumnDef<SetListStep>[]>(
    () => [
      {
        id: "index",
        enableSorting: false,
        header: () => <span className="w-[1%] whitespace-nowrap">#</span>,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.index + 1}</span>
        ),
      },
      {
        id: "name",
        enableSorting: false,
        header: () => "Namn",
        cell: ({ row }) => {
          const step = row.original;
          if (step.kind === "note") {
            return (
              <span className="whitespace-pre-wrap text-muted-foreground">
                {step.content}
              </span>
            );
          }
          return step.pieceName;
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Åtgärder</span>
        ),
        cell: ({ row }) => {
          const step = row.original;
          const stepIndex = row.index;
          const moveUpOrder = moveStepIds(orderedStepIds, stepIndex, "up");
          const moveDownOrder = moveStepIds(orderedStepIds, stepIndex, "down");

          return (
            <div className="flex flex-nowrap items-center gap-1">
              <Tooltip>
                <form action={reorderSetListSteps}>
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input type="hidden" name="setListId" value={setListId} />
                  <input
                    type="hidden"
                    name="orderedSetListStepIds"
                    value={JSON.stringify(moveUpOrder)}
                  />
                  <TooltipTrigger
                    type="submit"
                    disabled={stepIndex === 0}
                    className={buttonVariants({ variant: "ghost", size: "icon" })}
                  >
                    <ChevronUp className="size-4" aria-hidden="true" />
                    <span className="sr-only">Flytta upp</span>
                  </TooltipTrigger>
                </form>
                <TooltipContent side="top">Flytta upp</TooltipContent>
              </Tooltip>
              <Tooltip>
                <form action={reorderSetListSteps}>
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input type="hidden" name="setListId" value={setListId} />
                  <input
                    type="hidden"
                    name="orderedSetListStepIds"
                    value={JSON.stringify(moveDownOrder)}
                  />
                  <TooltipTrigger
                    type="submit"
                    disabled={stepIndex === orderedStepIds.length - 1}
                    className={buttonVariants({ variant: "ghost", size: "icon" })}
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                    <span className="sr-only">Flytta ner</span>
                  </TooltipTrigger>
                </form>
                <TooltipContent side="top">Flytta ner</TooltipContent>
              </Tooltip>
              <Tooltip>
                <form action={step.kind === "note" ? deleteSetListNote : removePieceFromSetList}>
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input
                    type="hidden"
                    name={step.kind === "note" ? "setListNoteId" : "setListPieceId"}
                    value={step.id}
                  />
                  <TooltipTrigger
                    type="submit"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "text-destructive hover:text-destructive"
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sr-only">Ta bort</span>
                  </TooltipTrigger>
                </form>
                <TooltipContent side="top">Ta bort</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [groupSlug, orderedStepIds, setListId]
  );

  return (
    <DataTable
      columns={columns}
      data={steps}
      enableSorting={false}
      emptyMessage="Inga steg i repertoaren ännu."
    />
  );
}
