"use client";

import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import { PieceCreditsList } from "@/components/pieces/PieceCreditsList";
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/data-table";
import { PieceInlineFilesCell } from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import { PieceNotesDialog } from "@/components/pieces/PieceNotesDialog";
import { SetListStepActions } from "@/components/setlists/SetListStepActions";
import { caseInsensitiveSortingFn } from "@/lib/data-table/sorting";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

// Body cells are top-aligned and every cell's first line is 32px tall (the
// height of the sm action buttons), so first lines line up across the row.
// Credit, Link and File rows are 28px, so their lists are nudged down 2px.
const FIRST_LINE_CLASS = "flex min-h-8 items-center";
const LIST_CELL_OFFSET_CLASS = "pt-0.5";

// A Running-order note row's text spans the Namn, Medverkande, Länkar and
// Filer columns.
const NOTE_COL_SPAN = 4;

// A row is a piece or, in set list mode, a Running-order note. Set list rows
// carry the step id, so the same piece can appear in several rows.
type PieceRow = { kind: "piece"; id: string; piece: PieceWithRelations };
type NoteRow = { kind: "note"; id: string; content: string };
type PiecesTableRow = PieceRow | NoteRow;

/** Cell renderer for piece-only columns; note rows never reach it (spanned) but render nothing. */
function pieceCell(render: (piece: PieceWithRelations) => ReactNode) {
  return function PieceCell({ row }: { row: { original: PiecesTableRow } }) {
    return row.original.kind === "piece" ? render(row.original.piece) : null;
  };
}

/**
 * The table for every list of pieces. Pass `setList` instead of `pieces` to
 * show a set list's steps in position order: adds a `#` column and the step
 * reorder/remove actions, turns off sorting and drops the delete-piece action.
 */
export function PiecesTable({
  people,
  groupSlug,
  ...props
}: {
  people: Person[];
  groupSlug: string;
} & (
  | { pieces: PieceWithRelations[]; setList?: undefined }
  | { pieces?: undefined; setList: { id: string; steps: SetListStep[] } }
)) {
  const { isEditing } = useEditMode();
  const { pieces, setList } = props;
  const rows = useMemo<PiecesTableRow[]>(
    () =>
      setList
        ? setList.steps
        : pieces.map((piece) => ({ kind: "piece", id: piece.id, piece })),
    [pieces, setList]
  );
  const orderedStepIds = useMemo(
    () => setList?.steps.map((step) => step.id) ?? [],
    [setList]
  );

  const columns = useMemo<ColumnDef<PiecesTableRow>[]>(
    () => [
      ...(setList
        ? [
            {
              id: "position",
              header: () => <span className="w-[1%] whitespace-nowrap">#</span>,
              cell: ({ row }) => (
                <div className={cn(FIRST_LINE_CLASS, "font-mono text-xs")}>
                  {row.index + 1}
                </div>
              ),
            } satisfies ColumnDef<PiecesTableRow>,
          ]
        : []),
      {
        id: "name",
        accessorFn: (row) => (row.kind === "piece" ? row.piece.name : ""),
        sortingFn: caseInsensitiveSortingFn,
        meta: {
          getColSpan: (row) => (row.kind === "note" ? NOTE_COL_SPAN : 1),
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Namn" />
        ),
        cell: ({ row }) =>
          row.original.kind === "note" ? (
            <div className="whitespace-pre-wrap py-1.5 text-muted-foreground">
              {row.original.content}
            </div>
          ) : (
            <div className={FIRST_LINE_CLASS}>
              <Link
                className="underline"
                href={`/app/${groupSlug}/pieces/${row.original.piece.id}`}
              >
                {row.original.piece.name}
              </Link>
            </div>
          ),
      },
      {
        id: "credits",
        enableSorting: false,
        header: () => "Medverkande",
        cell: pieceCell((piece) => {
          return (
            <div className="flex items-start gap-2">
              <div className={cn("min-w-0 flex-1", LIST_CELL_OFFSET_CLASS)}>
                {piece.credits.length === 0 ? null : (
                  <PieceCreditsList credits={piece.credits} />
                )}
              </div>
              {isEditing ? (
                <div className={FIRST_LINE_CLASS}>
                  <AddPieceCreditPopover
                    groupSlug={groupSlug}
                    people={people}
                    piece={{ id: piece.id, name: piece.name }}
                  />
                </div>
              ) : null}
            </div>
          );
        }),
      },
      {
        id: "links",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Länkar</span>
        ),
        cell: pieceCell((piece) => {
          return (
            <div className={LIST_CELL_OFFSET_CLASS}>
              <PieceInlineLinksCell
                readOnly={!isEditing}
                groupSlug={groupSlug}
                pieceId={piece.id}
                pieceName={piece.name}
                links={piece.links.map((link) => ({
                  id: link.id,
                  url: link.url,
                  label: link.label,
                }))}
              />
            </div>
          );
        }),
      },
      {
        id: "files",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Filer</span>
        ),
        cell: pieceCell((piece) => {
          return (
            <div
              className={cn(
                "flex min-w-[12rem] items-start",
                LIST_CELL_OFFSET_CLASS
              )}
            >
              <PieceInlineFilesCell
                readOnly={!isEditing}
                groupSlug={groupSlug}
                pieceId={piece.id}
                pieceName={piece.name}
                files={piece.files.map((file) => ({
                  id: file.id,
                  displayName: file.displayName,
                  size: file.size,
                }))}
              />
            </div>
          );
        }),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Åtgärder</span>
        ),
        cell: ({ row }) => {
          const step = row.original;
          const piece = step.kind === "piece" ? step.piece : null;
          return (
            <div className={cn(FIRST_LINE_CLASS, "gap-2")}>
              {setList && isEditing ? (
                <div className="flex items-center">
                  <SetListStepActions
                    step={step}
                    stepIndex={row.index}
                    orderedStepIds={orderedStepIds}
                    groupSlug={groupSlug}
                    setListId={setList.id}
                  />
                </div>
              ) : null}
              {piece && isEditing ? (
                <EditPieceDialog
                  groupSlug={groupSlug}
                  people={people}
                  piece={{
                    id: piece.id,
                    name: piece.name,
                    credits: piece.credits,
                  }}
                />
              ) : null}
              {piece ? (
                <PieceNotesDialog
                  readOnly={!isEditing}
                  groupSlug={groupSlug}
                  piece={{ id: piece.id, name: piece.name }}
                />
              ) : null}
              {piece && !setList && isEditing ? (
                <DeletePieceDialog
                  groupSlug={groupSlug}
                  piece={{ id: piece.id, name: piece.name }}
                />
              ) : null}
            </div>
          );
        },
      },
    ],
    [groupSlug, isEditing, orderedStepIds, people, setList]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      enableSorting={!setList}
      cellAlign="top"
      emptyMessage={setList ? "Inga steg i repertoaren ännu." : "Inga noter tillagda ännu."}
    />
  );
}
