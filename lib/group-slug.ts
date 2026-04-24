/** Reserved URL segment under `/app`; cannot be used as a group slug. */
export const RESERVED_GROUP_SLUG = "me";

const SWEDISH_MAP: Record<string, string> = {
  å: "a",
  ä: "a",
  ö: "o",
  é: "e",
  è: "e",
  ü: "u",
};

function transliterateToAscii(s: string): string {
  let out = "";
  for (const ch of s) {
    const lower = ch.toLowerCase();
    out += SWEDISH_MAP[lower] ?? lower;
  }
  return out
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** URL-safe base slug from display name (ASCII, lowercase, hyphenated). */
export function slugifyGroupName(raw: string): string {
  const transliterated = transliterateToAscii(raw.trim().toLowerCase());
  const segments = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return segments.length > 0 ? segments : "grupp";
}

export function isReservedGroupSlug(slug: string): boolean {
  return slug === RESERVED_GROUP_SLUG;
}
