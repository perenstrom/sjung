"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { SortingState } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";

import { type ColumnDef, DataTable, DataTableColumnHeader } from "@/components/data-table";
import { DeleteSetListDialog } from "@/components/DeleteSetListDialog";
import { EditSetListDialog } from "@/components/EditSetListDialog";
import { useEditMode } from "@/components/EditModeContext";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import { caseInsensitiveSortingFn } from "@/lib/data-table/sorting";
import { compareSetListsByDefault } from "@/lib/setlists/sorting";

export type SetListsTableRow = {
  id: string;
  name: string;
  date: Date | null;
  /**
   * Formatted on the server so the date doesn't shift with the viewer's time
   * zone. Null when the set list has no date.
   */
  dateLabel: string | null;
};

/** Desktop columns: Namn and Datum sort on click; Åtgärder only in edit mode. */
export function setListsColumns(
  groupSlug: string,
  isEditing: boolean
): ColumnDef<SetListsTableRow, unknown>[] {
  return [
    {
      accessorKey: "name",
      sortingFn: caseInsensitiveSortingFn,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Namn" />,
      cell: ({ row }) => (
        <Link
          href={`/app/${groupSlug}/setlists/${row.original.id}`}
          className="underline-offset-4 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "date",
      // Sort on the real date, not the formatted label. Undefined, unlike
      // null, lets `sortUndefined` keep undated Set lists last both ways.
      accessorFn: (row) => row.date ?? undefined,
      sortingFn: "datetime",
      sortUndefined: "last",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Datum" />,
      cell: ({ row }) => row.original.dateLabel ?? "–",
    },
    ...(isEditing
      ? [
          {
            id: "actions",
            enableSorting: false,
            header: () => <span className="w-[1%] whitespace-nowrap">Åtgärder</span>,
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <SetListRowActions groupSlug={groupSlug} setList={row.original} />
              </div>
            ),
          } satisfies ColumnDef<SetListsTableRow, unknown>,
        ]
      : []),
  ];
}

// The table's starting sort. With rows handed over already in
// compareSetListsByDefault order (which settles ties), it reproduces that
// order, so keep the two in step.
const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];

function getRowId(row: SetListsTableRow): string {
  return row.id;
}

/**
 * Set lists as a table from `md` up and as the shared mobile list below it,
 * both newest date first, undated last and same-date ones by name. The table's
 * Namn and Datum headings re-sort it; the mobile list keeps that order.
 */
export function SetListsTable({
  setLists,
  groupSlug,
}: {
  setLists: SetListsTableRow[];
  groupSlug: string;
}) {
  const { isEditing } = useEditMode();
  // In the default order, so the mobile list matches the table and, once a
  // heading is clicked, Set lists that tie keep it.
  const sortedSetLists = useMemo(
    () => [...setLists].sort(compareSetListsByDefault),
    [setLists]
  );
  const columns = useMemo(() => setListsColumns(groupSlug, isEditing), [groupSlug, isEditing]);

  return (
    <>
      <SetListsMobileList setLists={sortedSetLists} groupSlug={groupSlug} isEditing={isEditing} />
      <DataTable
        className="max-md:hidden"
        columns={columns}
        data={sortedSetLists}
        initialSorting={DEFAULT_SORTING}
        getRowId={getRowId}
        emptyMessage="Inga repertoarer tillagda ännu."
      />
    </>
  );
}

function SetListsMobileList({
  setLists,
  groupSlug,
  isEditing,
}: {
  setLists: SetListsTableRow[];
  groupSlug: string;
  isEditing: boolean;
}) {
  return (
    <MobileList>
      {setLists.length === 0 ? (
        <MobileListEmpty>Inga repertoarer tillagda ännu.</MobileListEmpty>
      ) : (
        setLists.map((setList) => (
          <MobileListRow
            key={setList.id}
            href={`/app/${groupSlug}/setlists/${setList.id}`}
            primary={setList.name}
            secondary={setList.dateLabel}
            trailing={
              isEditing ? (
                <SetListRowActions groupSlug={groupSlug} setList={setList} trigger="icon" />
              ) : (
                <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
              )
            }
          />
        ))
      )}
    </MobileList>
  );
}

function SetListRowActions({
  groupSlug,
  setList,
  trigger,
}: {
  groupSlug: string;
  setList: SetListsTableRow;
  trigger?: "button" | "icon";
}) {
  return (
    <>
      <EditSetListDialog
        groupSlug={groupSlug}
        setList={{ id: setList.id, name: setList.name, date: setList.date }}
        trigger={trigger}
      />
      <DeleteSetListDialog
        groupSlug={groupSlug}
        setList={{ id: setList.id, name: setList.name }}
        trigger={trigger}
      />
    </>
  );
}
