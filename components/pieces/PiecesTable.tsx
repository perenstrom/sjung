"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/data-table";
import { PieceLinksDialog } from "@/components/PieceLinksDialog";
import { caseInsensitiveSortingFn } from "@/lib/data-table/sorting";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { Person } from "@/types/piece-credit-dialog";

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
  const columns = useMemo<ColumnDef<PieceWithRelations>[]>(
    () => [
      {
        accessorKey: "name",
        sortingFn: caseInsensitiveSortingFn,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Namn" />
        ),
        cell: ({ row }) => (
          <Link
            className="underline"
            href={`/app/${groupSlug}/pieces/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "credits",
        enableSorting: false,
        header: () => "Medverkande",
        cell: ({ row }) => formatCreditsText(row.original),
      },
      {
        id: "links",
        enableSorting: false,
        header: () => (
          <span className="w-[1%] whitespace-nowrap">Länkar</span>
        ),
        cell: ({ row }) => (
          <PieceLinksDialog groupSlug={groupSlug} piece={row.original} />
        ),
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
            <div className="flex items-center gap-2">
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
              <DeletePieceDialog
                groupSlug={groupSlug}
                piece={{ id: piece.id, name: piece.name }}
              />
            </div>
          );
        },
      },
    ],
    [groupSlug, people]
  );

  return (
    <DataTable
      columns={columns}
      data={pieces}
      emptyMessage="Inga noter tillagda ännu."
    />
  );
}
