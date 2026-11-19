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
 *     sortFn: "caseInsensitive",
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
 * A column's `sortFn` can name any sort function registered in
 * `dataTableFeatures` (`lib/data-table/features.ts`).
 *
 * Use `enableSorting={false}` when the view uses manual reorder (e.g. setlist steps).
 * Pass `initialSorting` (e.g. `[{ id: "date", desc: true }]`) to start sorted.
 *
 * A column can make its cell span several columns per row with
 * `meta: { getColSpan: (row) => n }`; the covered cells are skipped. It can
 * style its header cell with `meta: { headerClassName }`.
 *
 * `renderRowDivider` can put a full-width row (e.g. a letter heading) before a
 * body row, given the row shown above it in the current sorted order.
 */
import {
  type CellData,
  type Column,
  type ColumnDef as TanStackColumnDef,
  FlexRender,
  type RowData,
  type SortingState,
  type TableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

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
import { type DataTableFeatures, dataTableFeatures } from "@/lib/data-table/features";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData> {
    /**
     * How many columns this column's cell covers in the given row (default 1).
     * The covered cells to its right are not rendered.
     */
    getColSpan?: (row: TData) => number;
    /** Classes for this column's header cell, e.g. `w-[1%]` to shrink it to fit. */
    headerClassName?: string;
  }
}

/** A column of a `DataTable`. */
export type ColumnDef<TData extends RowData, TValue extends CellData = CellData> = TanStackColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;

export interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  /** When false, rows keep server/data order (e.g. manual reorder tables). Default true. */
  enableSorting?: boolean;
  /** The sort the table starts with, before any heading is clicked. Default unsorted. */
  initialSorting?: SortingState;
  emptyMessage?: string;
  /** Vertical alignment of body cells. Default "middle". */
  cellAlign?: "middle" | "top";
  /**
   * A stable id per row. Rows are keyed by it, so state inside a row's cells
   * stays with that row when sorting or new data moves it. Default: the index.
   */
  getRowId?: (row: TData) => string;
  /**
   * A row to render before `row`, or null for none. `previousRow` is the row
   * shown directly above it in the current sorted order (undefined for the
   * first), and `colSpan` the number of visible columns, for a full-width row.
   */
  renderRowDivider?: (row: TData, previousRow: TData | undefined, colSpan: number) => ReactNode;
  className?: string;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  enableSorting = true,
  initialSorting = [],
  emptyMessage = "Inga rader.",
  cellAlign = "middle",
  getRowId,
  renderRowDivider,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    enableSorting,
    getRowId,
  });
  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.columnDef.meta?.headerClassName}
                >
                  {header.isPlaceholder ? null : <FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <Fragment key={row.id}>
                {renderRowDivider?.(row.original, rows[index - 1]?.original, columnCount)}
                <TableRow>
                  {spanCells(
                    row.getAllCells(),
                    (cell) => cell.column.columnDef.meta?.getColSpan?.(row.original) ?? 1
                  ).map(({ cell, colSpan }) => (
                    <TableCell
                      key={cell.id}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      className={cn(cellAlign === "top" && "align-top")}
                    >
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              </Fragment>
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

interface DataTableColumnHeaderProps<TData extends RowData, TValue extends CellData> {
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
  className?: string;
}

/** Sortable header control for use inside column `header` renderers. */
export function DataTableColumnHeader<TData extends RowData, TValue extends CellData>({
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
