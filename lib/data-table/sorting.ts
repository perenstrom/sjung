import type { Row, SortingFn } from "@tanstack/react-table";

export function compareCaseInsensitive(a: string, b: string): number {
  return a.localeCompare(b, "sv", { sensitivity: "base" });
}

/** Case- and accent-insensitive string sort for Swedish UI text columns. */
export function caseInsensitiveSortingFn<TData>(
  rowA: Row<TData>,
  rowB: Row<TData>,
  columnId: string
): number {
  const a = String(rowA.getValue(columnId) ?? "");
  const b = String(rowB.getValue(columnId) ?? "");
  return compareCaseInsensitive(a, b);
}

/** For `sortingFns` table option registration by name. */
export const caseInsensitiveSortingFns = {
  caseInsensitive: caseInsensitiveSortingFn as SortingFn<unknown>,
};
