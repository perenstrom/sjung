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

export type CategoryGroup<F, L> = {
  /** The Category, or `UNCATEGORIZED_HEADING` for the uncategorized. */
  heading: string;
  files: F[];
  links: L[];
};

/**
 * A Piece's Files and Links under their Categories, in ranking order with the
 * uncategorized last, each list keeping its order. `null` when nothing has a
 * Category, so the Piece shows no groups at all.
 */
export function groupByCategory<F extends { category: string | null }, L extends { category: string | null }>(
  files: readonly F[],
  links: readonly L[]
): CategoryGroup<F, L>[] | null {
  const used = [...files, ...links].flatMap((item) => (item.category === null ? [] : [item.category]));
  if (used.length === 0) return null;

  // Only the Categories in use, in ranking order, each once.
  const usedKeys = new Set(used.map(matchKey));
  const headings = rankCategories(used).filter((category) => usedKeys.has(matchKey(category)));

  const groups = [...headings, null].map((category) => {
    const key = category === null ? null : matchKey(category);
    const inGroup = (item: { category: string | null }) =>
      (item.category === null ? null : matchKey(item.category)) === key;
    return {
      heading: category ?? UNCATEGORIZED_HEADING,
      files: files.filter(inGroup),
      links: links.filter(inGroup),
    };
  });
  return groups.filter((group) => group.files.length > 0 || group.links.length > 0);
}
