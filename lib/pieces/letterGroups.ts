/**
 * Letter groups for the "Alla noter" list: each Piece sits under the letter
 * its name starts with, in the Swedish alphabet.
 */

import { swedishCollator } from "@/lib/data-table/sorting";

// The Swedish alphabet, in collation order.
const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ"];

/** The group for names that don't start with a letter (digits, punctuation). */
export const NON_LETTER_GROUP = "#";

/**
 * The letter group a Piece name belongs to: "A"…"Ö", or "#" when its first
 * character (after leading whitespace) is a digit or punctuation. Leading
 * quotation marks and articles are kept, so `"Hallelujah"` is under # and
 * "The Rose" under T.
 *
 * The group is the last letter of the alphabet the first character sorts at
 * or after, with the collation `compareCaseInsensitive` sorts by, so each
 * group is one unbroken run of the sorted list: É goes under E, and as in
 * Swedish sorting Ü under Y, Æ under Ä and Ø under Ö. Digits and punctuation
 * sort before A, so they make up #. A letter from outside the alphabet (ß, Þ,
 * Ω) goes in the group it sorts into rather than in a second #.
 */
export function letterGroupKey(name: string): string {
  const first = [...name.trimStart()][0];
  if (!first) return NON_LETTER_GROUP;
  return ALPHABET.findLast((letter) => swedishCollator.compare(first, letter) >= 0) ?? NON_LETTER_GROUP;
}

/**
 * The letter to show a divider for before the Piece `name`, given the name of
 * the Piece shown directly above it; null when it continues that Piece's group.
 */
export function letterDividerBefore(name: string, previousName: string | undefined): string | null {
  const key = letterGroupKey(name);
  return previousName !== undefined && letterGroupKey(previousName) === key ? null : key;
}
