import { constructSortFn } from "@tanstack/react-table";

/** Swedish collation that ignores case and accents (but keeps Å, Ä and Ö apart from A and O). */
export const swedishCollator = new Intl.Collator("sv", { sensitivity: "base" });

/** `swedishCollator` that also orders numbers by their value, so "Stämma 2" comes before "Stämma 10". */
export const swedishNumericCollator = new Intl.Collator("sv", { sensitivity: "base", numeric: true });

export function compareCaseInsensitive(a: string, b: string): number {
  return swedishCollator.compare(a, b);
}

/** Case- and accent-insensitive string sort for Swedish UI text columns. */
export const caseInsensitiveSortFn = constructSortFn({
  sort: (a, b) => compareCaseInsensitive(String(a ?? ""), String(b ?? "")),
});
