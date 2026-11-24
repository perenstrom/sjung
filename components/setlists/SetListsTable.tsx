"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";

import { type ColumnDef, DataTable, DataTableColumnHeader } from "@/components/data-table";
import { DeleteSetListDialog } from "@/components/DeleteSetListDialog";
import { EditSetListDialog } from "@/components/EditSetListDialog";
import { useEditMode } from "@/components/EditModeContext";
import { SetListName } from "@/components/setlists/SetListName";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import { groupSetListPath } from "@/lib/groups/routes";
import { compareSetListsByDefault } from "@/lib/setlists/sorting";

export type SetListsTableRow = {
  id: string;
  slug: string;
  name: string;
  date: Date | null;
  current: boolean;
  /**
   * Formatted on the server so the date doesn't shift with the viewer's time
   * zone. Null when the set list has no date.
   */
  dateLabel: string | null;
};

/** Desktop columns: Namn and Datum sort on click; Åtgärder only in edit mode. */
export function setListsColumns(groupSlug: string, isEditing: boolean): ColumnDef<SetListsTableRow>[] {
  return [
    {
      accessorKey: "name",
      sortFn: "caseInsensitive",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Namn" />,
      cell: ({ row }) => (
        <SetListName current={row.original.current}>
          <Link href={groupSetListPath(groupSlug, row.original)} className="underline-offset-4 hover:underline">
            {row.original.name}
          </Link>
        </SetListName>
      ),
    },
    {
      id: "date",
      // Sort on the real date, not the formatted label. Undefined, unlike
      // null, lets `sortUndefined` keep undated Set lists last both ways.
      accessorFn: (row) => row.date ?? undefined,
      sortFn: "datetime",
      sortUndefined: "last",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Datum" />,
      cell: ({ row }) => row.original.dateLabel ?? "–",
    },
    ...(isEditing
      ? [
          {
            id: "actions",
            enableSorting: false,
            // Shrinks the column to fit its buttons.
            meta: { headerClassName: "w-[1%]" },
            header: "Åtgärder",
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <SetListRowActions groupSlug={groupSlug} setList={row.original} />
              </div>
            ),
          } satisfies ColumnDef<SetListsTableRow>,
        ]
      : []),
  ];
}

function getRowId(row: SetListsTableRow): string {
  return row.id;
}

/**
 * Set lists as a table from `md` up and as the shared mobile list below it,
 * both in the default order (`compareSetListsByDefault`): Current Set lists
 * first. The table starts unsorted so it keeps that order; its Namn and Datum
 * headings re-sort every Set list by that column alone. The mobile list keeps
 * the default order.
 */
export function SetListsTable({ setLists, groupSlug }: { setLists: SetListsTableRow[]; groupSlug: string }) {
  const { isEditing } = useEditMode();
  // In the default order, so the mobile list matches the table and, once a
  // heading is clicked, Set lists that tie keep it.
  const sortedSetLists = useMemo(() => [...setLists].sort(compareSetListsByDefault), [setLists]);
  const columns = useMemo(() => setListsColumns(groupSlug, isEditing), [groupSlug, isEditing]);

  return (
    <>
      <SetListsMobileList setLists={sortedSetLists} groupSlug={groupSlug} isEditing={isEditing} />
      <DataTable
        className="max-md:hidden"
        columns={columns}
        data={sortedSetLists}
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
            href={groupSetListPath(groupSlug, setList)}
            primary={
              // One line: a long name truncates, the badge stays whole.
              <SetListName current={setList.current}>
                <span className="min-w-0 flex-1 truncate">{setList.name}</span>
              </SetListName>
            }
            secondary={setList.dateLabel}
            trailing={
              isEditing ? (
                <SetListRowActions groupSlug={groupSlug} setList={setList} trigger="icon" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
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
      <EditSetListDialog groupSlug={groupSlug} setList={setList} trigger={trigger} />
      <DeleteSetListDialog groupSlug={groupSlug} setList={setList} trigger={trigger} />
    </>
  );
}
