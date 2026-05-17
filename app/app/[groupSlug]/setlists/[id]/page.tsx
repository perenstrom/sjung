import {
  addPieceToSetList,
  appendSetListNote,
  deleteSetListNote,
  getSetListDetail,
  getSetListPieceOptions,
  reorderSetListPieces,
  removePieceFromSetList,
} from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SetListPiecePicker } from "@/components/SetListPiecePicker";
import type { SetListPieceStep, SetListStep } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

function formatSetListDate(date: Date | null): string {
  if (!date) {
    return "–";
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}

function movePieceIds(
  setListPieceIds: string[],
  fromIndex: number,
  direction: "up" | "down"
): string[] {
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= setListPieceIds.length) {
    return setListPieceIds;
  }
  const next = [...setListPieceIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function getPieceSteps(steps: SetListStep[]): SetListPieceStep[] {
  return steps.filter((step): step is SetListPieceStep => step.kind === "piece");
}

export default async function TenantSetListDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [setList, pieces, groups] = await Promise.all([
    getSetListDetail(groupSlug, id),
    getSetListPieceOptions(groupSlug),
    getGroups(),
  ]);

  if (!setList) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;
  const pieceSteps = getPieceSteps(setList.steps);
  const orderedPieceIds = pieceSteps.map((step) => step.id);

  return (
    <div className="space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [
            createGroupAncestor(groupSlug, groupName),
            { label: "Repertoarer", href: `/app/${groupSlug}/setlists` },
          ],
          tail: { kind: "static", label: setList.name || "Repertoar" },
        }}
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{setList.name}</h1>
        <p className="text-sm text-muted-foreground">Datum: {formatSetListDate(setList.date)}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lägg till stycke</h2>
        <form action={addPieceToSetList} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
          <div className="sm:w-80">
            <SetListPiecePicker pieces={pieces} />
          </div>
          <Button type="submit" disabled={pieces.length === 0}>
            Lägg till
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lägg till anteckning</h2>
        <form action={appendSetListNote} className="space-y-3">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
          <label className="block space-y-2">
            <span className="text-sm font-medium">Lägg till anteckning</span>
            <textarea
              name="content"
              required
              rows={4}
              className={cn(
                "border-input placeholder:text-muted-foreground flex min-h-[6rem] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
            />
          </label>
          <Button type="submit">Lägg till anteckning</Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Ordning</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[1%] whitespace-nowrap">#</TableHead>
              <TableHead>Innehåll</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setList.steps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Inga steg i repertoaren ännu.
                </TableCell>
              </TableRow>
            ) : (
              setList.steps.map((step, index) => {
                if (step.kind === "note") {
                  return (
                    <TableRow key={step.id}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="whitespace-pre-wrap text-muted-foreground">
                        {step.content}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <form action={deleteSetListNote}>
                            <input type="hidden" name="groupSlug" value={groupSlug} />
                            <input type="hidden" name="setListNoteId" value={step.id} />
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
                      </TableCell>
                    </TableRow>
                  );
                }

                const pieceIndex = pieceSteps.findIndex((pieceStep) => pieceStep.id === step.id);
                const moveUpOrder = movePieceIds(orderedPieceIds, pieceIndex, "up");
                const moveDownOrder = movePieceIds(orderedPieceIds, pieceIndex, "down");

                return (
                  <TableRow key={step.id}>
                    <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                    <TableCell>{step.pieceName}</TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap items-center gap-1">
                        <Tooltip>
                          <form action={reorderSetListPieces}>
                            <input type="hidden" name="groupSlug" value={groupSlug} />
                            <input type="hidden" name="setListId" value={setList.id} />
                            <input
                              type="hidden"
                              name="orderedSetListPieceIds"
                              value={JSON.stringify(moveUpOrder)}
                            />
                            <TooltipTrigger
                              type="submit"
                              disabled={pieceIndex === 0}
                              className={buttonVariants({ variant: "ghost", size: "icon" })}
                            >
                              <ChevronUp className="size-4" aria-hidden="true" />
                              <span className="sr-only">Flytta upp</span>
                            </TooltipTrigger>
                          </form>
                          <TooltipContent side="top">Flytta upp</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <form action={reorderSetListPieces}>
                            <input type="hidden" name="groupSlug" value={groupSlug} />
                            <input type="hidden" name="setListId" value={setList.id} />
                            <input
                              type="hidden"
                              name="orderedSetListPieceIds"
                              value={JSON.stringify(moveDownOrder)}
                            />
                            <TooltipTrigger
                              type="submit"
                              disabled={pieceIndex === pieceSteps.length - 1}
                              className={buttonVariants({ variant: "ghost", size: "icon" })}
                            >
                              <ChevronDown className="size-4" aria-hidden="true" />
                              <span className="sr-only">Flytta ner</span>
                            </TooltipTrigger>
                          </form>
                          <TooltipContent side="top">Flytta ner</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <form action={removePieceFromSetList}>
                            <input type="hidden" name="groupSlug" value={groupSlug} />
                            <input type="hidden" name="setListPieceId" value={step.id} />
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
