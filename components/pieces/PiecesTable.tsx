"use client";

import Link from "next/link";
import { type ComponentProps, createContext, type ReactNode, useContext, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import { PieceCreditsList } from "@/components/pieces/PieceCreditsList";
import { PieceNameEditor } from "@/components/pieces/PieceNameEditor";
import { RemovableCreditsList } from "@/components/pieces/RemovableCreditsList";
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/data-table";
import { toInlineFiles, toInlineLinks } from "@/components/pieces/inlineItems";
import { PieceInlineFilesAndLinksCell } from "@/components/pieces/PieceInlineFilesAndLinksCell";
import { PieceNotesDialog } from "@/components/pieces/PieceNotesDialog";
import { PieceNotesList } from "@/components/pieces/PieceNotesList";
import { LetterDividerTableRow } from "@/components/pieces/LetterDivider";
import { PiecesMobileList } from "@/components/pieces/PiecesMobileList";
import { SetListStepActions } from "@/components/setlists/SetListStepActions";
import { caseInsensitiveSortingFn, compareCaseInsensitive } from "@/lib/data-table/sorting";
import { pieceHref } from "@/lib/pieces/href";
import { letterDividerBefore } from "@/lib/pieces/letterGroups";
import { pieceMatchesSearch } from "@/lib/pieces/search";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

// Body cells are top-aligned and every cell's first line is 32px tall (the
// height of the sm action buttons), so first lines line up across the row.
// Credit, Link and File rows are 28px, so their lists are nudged down 2px.
const FIRST_LINE_CLASS = "flex min-h-8 items-center";
const LIST_CELL_OFFSET_CLASS = "pt-0.5";

// A Running-order note row's text spans the Namn, Medverkande, Anteckningar
// and Filer och länkar columns.
const RUNNING_ORDER_NOTE_COL_SPAN = 4;

// The list columns are capped at the same max width as Namn, so a long entry
// wraps (or, for file names and link labels, truncates) instead of stretching
// its column and pushing Åtgärder off-screen. They share one width so they
// stay in step with each other.
const LIST_COLUMN_WIDTH_CLASS = "min-w-56 max-w-xs";

// A piece note's first ~19px line is nudged down to sit centred in the 32px
// first line.
const PIECE_NOTES_OFFSET_CLASS = "pt-1.5";

// A long piece name wraps instead of widening the Namn column: it turns the
// table cell's nowrap back off and caps the width. The link also needs
// min-w-0, or as a flex item it won't shrink below an unbroken word. The
// vertical padding keeps a wrapped name's first line where a one-line name
// sits in the 32px first line. Set on the piece-name content only, so a
// spanning Running-order note row keeps its full width.
const PIECE_NAME_WRAP_CLASS = "max-w-xs py-1.5 whitespace-normal break-words";

// A row is a piece or, in set list mode, a Running-order note. Set list rows
// carry the step id, so the same piece can appear in several rows.
type PieceRow = { kind: "piece"; id: string; piece: PieceWithRelations };
type NoteRow = { kind: "note"; id: string; content: string };
type PiecesTableRow = PieceRow | NoteRow;

// Cell data that is a new object after every router.refresh(). The columns
// memo must not depend on it: new columns mean new cell components, which
// remounts every cell and closes any dialog open inside one.
const PiecesTableCellContext = createContext<{
  people: Person[];
  creditRoles: string[];
  orderedStepIds: string[];
}>({ people: [], creditRoles: [], orderedStepIds: [] });

function AddCreditAction(
  props: Omit<ComponentProps<typeof AddPieceCreditPopover>, "people" | "creditRoles">
) {
  const { people, creditRoles } = useContext(PiecesTableCellContext);
  return <AddPieceCreditPopover people={people} creditRoles={creditRoles} {...props} />;
}

function StepActions(props: Omit<ComponentProps<typeof SetListStepActions>, "orderedStepIds">) {
  const { orderedStepIds } = useContext(PiecesTableCellContext);
  return <SetListStepActions orderedStepIds={orderedStepIds} {...props} />;
}

/** On Alla noter: the letter heading before the first Piece of each letter group, as currently sorted. */
function renderLetterDivider(
  row: PiecesTableRow,
  previousRow: PiecesTableRow | undefined,
  colSpan: number
): ReactNode {
  if (row.kind !== "piece") return null;
  const previousName = previousRow?.kind === "piece" ? previousRow.piece.name : undefined;
  const letter = letterDividerBefore(row.piece.name, previousName);
  return letter ? <LetterDividerTableRow letter={letter} colSpan={colSpan} /> : null;
}

// Rows keep their cells' state (e.g. an open name editor) when a rename re-sorts them.
function getRowId(row: PiecesTableRow): string {
  return row.id;
}

/** The piece's name as a link to piece detail; in edit mode with a pencil to rename it. */
function PieceNameCell({
  piece,
  groupSlug,
  setListId,
  isEditing,
}: {
  piece: PieceWithRelations;
  groupSlug: string;
  setListId: string | undefined;
  isEditing: boolean;
}) {
  const href = pieceHref(groupSlug, piece.id, { fromSetListId: setListId });
  const renderName = (name: string) => (
    <Link className="min-w-0 underline" href={href}>
      {name}
    </Link>
  );

  return (
    <div className={cn(FIRST_LINE_CLASS, PIECE_NAME_WRAP_CLASS)}>
      {isEditing ? (
        <PieceNameEditor
          groupSlug={groupSlug}
          pieceId={piece.id}
          name={piece.name}
          renderName={renderName}
          // The Namn column is narrow; keep the input wide enough to type in.
          inputClassName="min-w-40"
        />
      ) : (
        renderName(piece.name)
      )}
    </div>
  );
}

/** Cell renderer for piece-only columns; note rows never reach it (spanned) but render nothing. */
function pieceCell(render: (piece: PieceWithRelations) => ReactNode) {
  return function PieceCell({ row }: { row: { original: PiecesTableRow } }) {
    return row.original.kind === "piece" ? render(row.original.piece) : null;
  };
}

/**
 * The table for every list of pieces: a table from `md` up and
 * `PiecesMobileList` below it. Pass `setList` instead of `pieces` to
 * show a set list's steps in position order: adds a `#` column and the step
 * reorder/remove actions, turns off sorting and drops the delete-piece action.
 * Without `setList` (Alla noter) the pieces are shown in Swedish order, under
 * a letter heading per first letter, narrowed to those matching `search`.
 */
export function PiecesTable({
  people,
  creditRoles,
  groupSlug,
  ...props
}: {
  people: Person[];
  creditRoles: string[];
  groupSlug: string;
} & (
  | { pieces: PieceWithRelations[]; search?: string; setList?: undefined }
  | { pieces?: undefined; search?: undefined; setList: { id: string; steps: SetListStep[] } }
)) {
  const { isEditing } = useEditMode();
  const { setList, search = "" } = props;
  const setListId = setList?.id;
  // The database's order may not be Swedish, so Alla noter sorts on the client:
  // first load, the table and the mobile list then agree, and the letter groups hold.
  const sortedPieces = useMemo(
    () => props.pieces && [...props.pieces].sort((a, b) => compareCaseInsensitive(a.name, b.name)),
    [props.pieces]
  );
  // Filtered before rows are made, so the letter dividers follow the matches.
  const pieces = useMemo(
    () => sortedPieces?.filter((piece) => pieceMatchesSearch(piece, search)),
    [sortedPieces, search]
  );
  const emptyMessage = setList
    ? "Inga steg i repertoaren ännu."
    : sortedPieces?.length
      ? `Inga stycken matchar "${search.trim()}"`
      : "Inga noter tillagda ännu.";
  const rows = useMemo<PiecesTableRow[]>(
    () =>
      setList
        ? setList.steps
        : (pieces ?? []).map((piece) => ({ kind: "piece", id: piece.id, piece })),
    [pieces, setList]
  );
  const cellContext = useMemo(
    () => ({ people, creditRoles, orderedStepIds: setList?.steps.map((step) => step.id) ?? [] }),
    [people, creditRoles, setList]
  );

  const columns = useMemo<ColumnDef<PiecesTableRow>[]>(
    () => [
      ...(setListId
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
          getColSpan: (row) => (row.kind === "note" ? RUNNING_ORDER_NOTE_COL_SPAN : 1),
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
            <PieceNameCell
              piece={row.original.piece}
              groupSlug={groupSlug}
              setListId={setListId}
              isEditing={isEditing}
            />
          ),
      },
      {
        id: "credits",
        enableSorting: false,
        header: () => "Medverkande",
        cell: pieceCell((piece) => {
          return (
            <div className={cn(LIST_COLUMN_WIDTH_CLASS, "flex items-start gap-2 whitespace-normal")}>
              <div className={cn("min-w-0 flex-1", LIST_CELL_OFFSET_CLASS)}>
                {piece.credits.length === 0 ? null : isEditing ? (
                  <RemovableCreditsList
                    groupSlug={groupSlug}
                    pieceId={piece.id}
                    credits={piece.credits}
                  />
                ) : (
                  <PieceCreditsList credits={piece.credits} />
                )}
              </div>
              {isEditing ? (
                <div className={FIRST_LINE_CLASS}>
                  <AddCreditAction
                    groupSlug={groupSlug}
                    piece={{ id: piece.id, name: piece.name, credits: piece.credits }}
                  />
                </div>
              ) : null}
            </div>
          );
        }),
      },
      {
        id: "notes",
        enableSorting: false,
        header: () => "Anteckningar",
        cell: pieceCell((piece) => {
          return (
            <div
              className={cn(LIST_COLUMN_WIDTH_CLASS, PIECE_NOTES_OFFSET_CLASS, "space-y-1 whitespace-normal")}
            >
              <PieceNotesList notes={piece.notes} />
              {isEditing ? (
                <PieceNotesDialog
                  groupSlug={groupSlug}
                  piece={{ id: piece.id, name: piece.name }}
                  hasNotes={piece.notes.length > 0}
                />
              ) : null}
            </div>
          );
        }),
      },
      {
        id: "filesAndLinks",
        enableSorting: false,
        header: () => "Filer och länkar",
        cell: pieceCell((piece) => {
          return (
            <div className={cn(LIST_COLUMN_WIDTH_CLASS, LIST_CELL_OFFSET_CLASS)}>
              <PieceInlineFilesAndLinksCell
                readOnly={!isEditing}
                groupSlug={groupSlug}
                pieceId={piece.id}
                pieceName={piece.name}
                files={toInlineFiles(piece)}
                links={toInlineLinks(piece)}
              />
            </div>
          );
        }),
      },
      // Read mode has no actions, so it has no Åtgärder column either.
      ...(isEditing
        ? [
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
                    {setListId ? (
                      <div className="flex items-center">
                        <StepActions
                          step={step}
                          stepIndex={row.index}
                          groupSlug={groupSlug}
                          setListId={setListId}
                        />
                      </div>
                    ) : null}
                    {piece && !setListId ? (
                      <DeletePieceDialog
                        groupSlug={groupSlug}
                        piece={{ id: piece.id, name: piece.name }}
                      />
                    ) : null}
                  </div>
                );
              },
            } satisfies ColumnDef<PiecesTableRow>,
          ]
        : []),
    ],
    [groupSlug, isEditing, setListId]
  );

  return (
    <PiecesTableCellContext.Provider value={cellContext}>
      <PiecesMobileList
        {...(setList ? { setList } : { pieces: pieces ?? [] })}
        people={people}
        creditRoles={creditRoles}
        groupSlug={groupSlug}
        isEditing={isEditing}
        emptyMessage={emptyMessage}
      />
      <DataTable
        className="max-md:hidden"
        columns={columns}
        data={rows}
        enableSorting={!setList}
        cellAlign="top"
        getRowId={getRowId}
        renderRowDivider={setList ? undefined : renderLetterDivider}
        emptyMessage={emptyMessage}
      />
    </PiecesTableCellContext.Provider>
  );
}
