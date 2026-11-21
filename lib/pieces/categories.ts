import { swedishNumericCollator } from "@/lib/data-table/sorting";
import { matchKey } from "@/lib/text/match-key";
import { createVocabulary } from "@/lib/text/vocabulary";

/**
 * Categories on Files and Links are a free-text vocabulary shared by both
 * (see `createVocabulary`). These three are always offered and rank first,
 * in this order.
 */
const categories = createVocabulary(["Noter", "Övningsfiler", "Inspelningar"]);

export const MAX_CATEGORY_LENGTH = 50;

/** The heading of the uncategorized; giving something this Category leaves it uncategorized. */
export const UNCATEGORIZED_HEADING = "Övrigt";

export const rankCategories = categories.rank;
export const categorySuggestions = categories.suggestions;

/** Whether to offer the typed text as a new Category; "Övrigt" is no Category, so it isn't offered. */
export function shouldOfferNewCategory(known: readonly string[], query: string): boolean {
  return matchKey(query) !== matchKey(UNCATEGORIZED_HEADING) && categories.shouldOfferNew(known, query);
}

/**
 * The Category to store for a typed one: the existing spelling when it
 * matches one, else the typed text normalized. Empty text and "Övrigt" leave
 * no Category.
 */
export function resolveCategory(typed: string, groupCategories: readonly string[]): string | null {
  const key = matchKey(typed);
  if (key === "" || key === matchKey(UNCATEGORIZED_HEADING)) return null;
  return categories.resolve(typed, groupCategories);
}

/** A File or a Link in a Category group. */
export type CategoryEntry<F, L> = { kind: "file"; file: F } | { kind: "link"; link: L };

export type CategoryGroup<F, L> = {
  /**
   * The Category, `UNCATEGORIZED_HEADING` for the uncategorized, or `null`
   * when nothing has a Category and the one list goes without a heading.
   */
  heading: string | null;
  /** Files and Links together, alphabetically by name, a File before a Link of the same name. */
  entries: CategoryEntry<F, L>[];
};

/** The name a File or Link shows, which its group is sorted by. */
export type NameOf<F, L> = { file: (file: F) => string; link: (link: L) => string };

type Groupable = { id: string; category: string | null };

/**
 * A Piece's Files and Links under their Categories, in ranking order with the
 * uncategorized last. Each group is one list of Files and Links together,
 * sorted alphabetically by the name each shows (Swedish order, numbers by
 * value), a File before a Link of the same name. When nothing has a Category,
 * they are one list without a heading. Empty groups are left out.
 */
export function groupByCategory<F extends Groupable, L extends Groupable>(
  files: readonly F[],
  links: readonly L[],
  nameOf: NameOf<F, L>
): CategoryGroup<F, L>[] {
  // Sorted with `id` breaking the last tie, so the order and the spelling of
  // each heading don't depend on the order the database returns them in.
  const sorted = [
    ...files.map((file) => ({ entry: { kind: "file" as const, file }, item: file, name: nameOf.file(file) })),
    ...links.map((link) => ({ entry: { kind: "link" as const, link }, item: link, name: nameOf.link(link) })),
  ].sort(
    (a, b) =>
      swedishNumericCollator.compare(a.name, b.name) ||
      Number(a.entry.kind === "link") - Number(b.entry.kind === "link") ||
      (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0)
  );

  const entriesOf = (inGroup: (category: string | null) => boolean): CategoryEntry<F, L>[] =>
    sorted.filter(({ item }) => inGroup(item.category)).map(({ entry }) => entry);

  const used = sorted.flatMap(({ item }) => (item.category === null ? [] : [item.category]));
  if (used.length === 0) {
    return sorted.length > 0 ? [{ heading: null, entries: entriesOf(() => true) }] : [];
  }

  // Only the Categories in use, in ranking order, each once.
  const usedKeys = new Set(used.map(matchKey));
  const headings = rankCategories(used).filter((category) => usedKeys.has(matchKey(category)));

  const groups = [...headings, null].map((heading) => {
    const key = heading === null ? null : matchKey(heading);
    return {
      heading: heading ?? UNCATEGORIZED_HEADING,
      entries: entriesOf((category) => (category === null ? null : matchKey(category)) === key),
    };
  });
  return groups.filter((group) => group.entries.length > 0);
}
