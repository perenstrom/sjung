import type { Row, SortingFn, SortingFns } from "@tanstack/react-table";

// Registers our named sorting fns so columns can reference them by string,
// e.g. `sortingFn: "caseInsensitive"`. TanStack then requires every table to
// pass `sortingFns`, which `caseInsensitiveSortingFns` satisfies.
declare module "@tanstack/react-table" {
  interface SortingFns {
    caseInsensitive: SortingFn<unknown>;
  }
}

/** Swedish collation that ignores case and accents (but keeps Å, Ä and Ö apart from A and O). */
export const swedishCollator = new Intl.Collator("sv", { sensitivity: "base" });

export function compareCaseInsensitive(a: string, b: string): number {
  return swedishCollator.compare(a, b);
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
} satisfies SortingFns;
