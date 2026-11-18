/** Trimmed, with each run of whitespace collapsed to one space. */
export function normalizeSpacing(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * What two names compare by when they are the same if they differ only in
 * letter case or spacing. Accents count: "Åström" and "Aström" differ.
 */
export function matchKey(text: string): string {
  return normalizeSpacing(text).toLocaleLowerCase("sv");
}
