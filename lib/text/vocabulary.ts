import { compareCaseInsensitive } from "@/lib/data-table/sorting";
import { matchKey, normalizeSpacing } from "@/lib/text/match-key";

/**
 * A Group's free-text vocabulary, such as its Credit roles or Categories: the
 * terms it has used, plus a few built-in ones that are always offered and rank
 * first, in their order. Every other term follows alphabetically. Two terms
 * are the same if they differ only in letter case or spacing (`matchKey`), and
 * the spelling already in use wins.
 */
export type Vocabulary = {
  builtIns: readonly string[];
  /** Built-in terms in their order first, then every other term alphabetically. */
  compare: (a: string, b: string) => number;
  /**
   * The built-in terms merged with those the Group uses, each once (the
   * built-in or first-seen spelling wins), in ranked order.
   */
  rank: (groupTerms: readonly string[]) => string[];
  /**
   * The term to store for a typed one: the existing spelling when it matches a
   * built-in term or one the Group already uses, else the typed text normalized.
   */
  resolve: (typed: string, groupTerms: readonly string[]) => string;
  /** The terms to list for the typed text: those containing it anywhere, ignoring case and spacing. */
  suggestions: (terms: readonly string[], query: string) => string[];
  /** Whether to offer the typed text as a new term: it's not empty and is no known term. */
  shouldOfferNew: (terms: readonly string[], query: string) => boolean;
};

export function createVocabulary(builtIns: readonly string[]): Vocabulary {
  function compare(a: string, b: string): number {
    const rankA = builtIns.indexOf(a);
    const rankB = builtIns.indexOf(b);
    if (rankA !== -1 && rankB !== -1) return rankA - rankB;
    if (rankA !== -1) return -1;
    if (rankB !== -1) return 1;
    return compareCaseInsensitive(a, b);
  }

  function rank(groupTerms: readonly string[]): string[] {
    const byKey = new Map<string, string>();
    for (const term of [...builtIns, ...groupTerms]) {
      const normalized = normalizeSpacing(term);
      const key = matchKey(normalized);
      if (normalized !== "" && !byKey.has(key)) byKey.set(key, normalized);
    }
    return [...byKey.values()].sort(compare);
  }

  function resolve(typed: string, groupTerms: readonly string[]): string {
    const key = matchKey(typed);
    return rank(groupTerms).find((term) => matchKey(term) === key) ?? normalizeSpacing(typed);
  }

  function suggestions(terms: readonly string[], query: string): string[] {
    const needle = matchKey(query);
    return terms.filter((term) => matchKey(term).includes(needle));
  }

  function shouldOfferNew(terms: readonly string[], query: string): boolean {
    const key = matchKey(query);
    return key !== "" && !terms.some((term) => matchKey(term) === key);
  }

  return { builtIns, compare, rank, resolve, suggestions, shouldOfferNew };
}
