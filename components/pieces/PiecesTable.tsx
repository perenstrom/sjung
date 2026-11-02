"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/data-table";
import { PieceInlineFilesCell } from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import { PieceNotesDialog } from "@/components/pieces/PieceNotesDialog";
import { caseInsensitiveSortingFn } from "@/lib/data-table/sorting";
import type { PieceWithRelations } from "@/lib/pieces/types";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

// Body cells are top-aligned and every cell's first line is 32px tall (the
// height of the sm action buttons), so first lines line up across the row.
// Link and File rows are 28px, so their cells are nudged down 2px.
const FIRST_LINE_CLASS = "flex min-h-8 items-center";
const LIST_CELL_OFFSET_CLASS = "pt-0.5";

function formatCreditsText(piece: PieceWithRelations): string {
  return piece.credits.length > 0
    ? piece.credits
        .map((credit) => `${credit.person.name} (${credit.role})`)
        .join(", ")
    : "–";
}

export function PiecesTable({
  pieces,
  people,
  groupSlug,
}: {
  pieces: PieceWithRelations[];
  people: Person[];
  groupSlug: string;
}) {
  const { isEditing } = useEditMode();
  const columns = useMemo<ColumnDef<PieceWithRelations>[]>(
    () => [
      {
        accessorKey: "name",
        sortingFn: caseInsensitiveSortingFn,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Namn" />
        ),
        cell: ({ row }) => (
          <div className={FIRST_LINE_CLASS}>
            <Link
              className="underline"
              href={`/app/${groupSlug}/pieces/${row.original.id}`}
            >
              {row.original.name}
            </Link>
          </div>
        ),
      },
      {
        id: "credits",
        enableSorting: false,
        header: () => "Medverkande",
        cell: ({ row }) => {
          const piece = row.original;
          return (
            <div className={cn(FIRST_LINE_CLASS, "gap-2")}>
              <span className="min-w-0 flex-1">{formatCreditsText(piece)}</span>
              {isEditing ? (
                <AddPieceCreditPopover
                  groupSlug={groupSlug}
                  people={people}
                  piece={{ id: piece.id, name: piece.name }}
                />
              ) : null}
            </div>
          );
        },
      },
      {
        id: "links",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Länkar</span>
        ),
        cell: ({ row }) => {
          const piece = row.original;
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
        },
      },
      {
        id: "files",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Filer</span>
        ),
        cell: ({ row }) => {
          const piece = row.original;
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
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Åtgärder</span>
        ),
        cell: ({ row }) => {
          const piece = row.original;
          return (
            <div className={cn(FIRST_LINE_CLASS, "gap-2")}>
              {isEditing ? (
                <EditPieceDialog
                  groupSlug={groupSlug}
                  people={people}
                  piece={{
                    id: piece.id,
                    name: piece.name,
                    credits: piece.credits.map((credit) => ({
                      personId: credit.personId,
                      role: credit.role,
                    })),
                  }}
                />
              ) : null}
              <PieceNotesDialog
                readOnly={!isEditing}
                groupSlug={groupSlug}
                piece={{ id: piece.id, name: piece.name }}
              />
              {isEditing ? (
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
    [groupSlug, isEditing, people]
  );

  return (
    <DataTable
      columns={columns}
      data={pieces}
      cellAlign="top"
      emptyMessage="Inga noter tillagda ännu."
    />
  );
}
