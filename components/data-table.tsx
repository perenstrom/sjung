"use client";

/**
 * Shared TanStack Table wrapper for app list views.
 *
 * Migration pattern (PER-141, PER-196):
 *
 * ```tsx
 * const columns: ColumnDef<MyRow>[] = [
 *   {
 *     accessorKey: "name",
 *     sortingFn: caseInsensitiveSortingFn,
 *     header: ({ column }) => (
 *       <DataTableColumnHeader column={column} title="Namn" />
 *     ),
 *   },
 *   {
 *     id: "actions",
 *     enableSorting: false,
 *     header: () => "Åtgärder",
 *     cell: ({ row }) => <MyRowActions row={row.original} />,
 *   },
 * ];
 *
 * <DataTable columns={columns} data={rows} enableSorting={false} />
 * ```
 *
 * Use `enableSorting={false}` when the view uses manual reorder (e.g. setlist steps).
 *
 * A column can make its cell span several columns per row with
 * `meta: { getColSpan: (row) => n }`; the covered cells are skipped.
 */
import {
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { spanCells } from "@/lib/data-table/cellSpans";
import { caseInsensitiveSortingFns } from "@/lib/data-table/sorting";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * How many columns this column's cell covers in the given row (default 1).
     * The covered cells to its right are not rendered.
     */
    getColSpan?: (row: TData) => number;
  }
}

export type { ColumnDef };

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** When false, rows keep server/data order (e.g. manual reorder tables). Default true. */
  enableSorting?: boolean;
  emptyMessage?: string;
  /** Vertical alignment of body cells. Default "middle". */
  cellAlign?: "middle" | "top";
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableSorting = true,
  emptyMessage = "Inga rader.",
  cellAlign = "middle",
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    enableSorting,
    sortingFns: caseInsensitiveSortingFns,
  });

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {spanCells(
                  row.getVisibleCells(),
                  (cell) => cell.column.columnDef.meta?.getColSpan?.(row.original) ?? 1
                ).map(({ cell, colSpan }) => (
                  <TableCell
                    key={cell.id}
                    colSpan={colSpan > 1 ? colSpan : undefined}
                    className={cn(cellAlign === "top" && "align-top")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

/** Sortable header control for use inside column `header` renderers. */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp />
      ) : sorted === "desc" ? (
        <ArrowDown />
      ) : (
        <ArrowUpDown />
      )}
    </Button>
  );
}
