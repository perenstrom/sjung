import {
  addPieceToSetList,
  getSetListDetail,
  getSetListPieceOptions,
  reorderSetListPieces,
  removePieceFromSetList,
} from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { Button } from "@/components/ui/button";
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
        <h2 className="text-lg font-medium">Stycken</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[1%] whitespace-nowrap">#</TableHead>
              <TableHead>Namn</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setList.pieces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Inga stycken i repertoaren ännu.
                </TableCell>
              </TableRow>
            ) : (
              setList.pieces.map((entry, index) => {
                const orderedIds = setList.pieces.map((pieceEntry) => pieceEntry.id);
                const moveUpOrder = movePieceIds(orderedIds, index, "up");
                const moveDownOrder = movePieceIds(orderedIds, index, "down");
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                    <TableCell>{entry.pieceName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Tooltip>
                          <form action={reorderSetListPieces}>
                            <input type="hidden" name="groupSlug" value={groupSlug} />
                            <input type="hidden" name="setListId" value={setList.id} />
                            <input
                              type="hidden"
                              name="orderedSetListPieceIds"
                              value={JSON.stringify(moveUpOrder)}
                            />
                            <TooltipTrigger asChild>
                              <Button type="submit" variant="ghost" size="icon" disabled={index === 0}>
                                <ChevronUp className="size-4" aria-hidden="true" />
                                <span className="sr-only">Flytta upp</span>
                              </Button>
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
                            <TooltipTrigger asChild>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                disabled={index === setList.pieces.length - 1}
                              >
                                <ChevronDown className="size-4" aria-hidden="true" />
                                <span className="sr-only">Flytta ner</span>
                              </Button>
                            </TooltipTrigger>
                          </form>
                          <TooltipContent side="top">Flytta ner</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <form action={removePieceFromSetList}>
                            <input type="hidden" name="groupSlug" value={groupSlug} />
                            <input type="hidden" name="setListPieceId" value={entry.id} />
                            <TooltipTrigger asChild>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span className="sr-only">Ta bort</span>
                              </Button>
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
