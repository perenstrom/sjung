import { createSortedRowModel, rowSortingFeature, sortFn_datetime, tableFeatures } from "@tanstack/react-table";

import { caseInsensitiveSortFn } from "@/lib/data-table/sorting";

/**
 * The TanStack Table features every `DataTable` registers: click-to-sort
 * columns, plus the sort functions a column can name in `sortFn`.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { caseInsensitive: caseInsensitiveSortFn, datetime: sortFn_datetime },
});

export type DataTableFeatures = typeof dataTableFeatures;
