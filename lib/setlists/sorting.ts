import { compareCaseInsensitive } from "@/lib/data-table/sorting";

type SortableSetList = { name: string; date: Date | null };

/**
 * The Set lists list's default order: newest date first, undated Set lists
 * last, and Set lists on the same date (or both undated) in Swedish name order.
 */
export function compareSetListsByDefault(a: SortableSetList, b: SortableSetList): number {
  if (a.date && b.date) {
    const byDate = b.date.getTime() - a.date.getTime();
    if (byDate !== 0) return byDate;
  } else if (a.date || b.date) {
    return a.date ? -1 : 1;
  }
  return compareCaseInsensitive(a.name, b.name);
}
