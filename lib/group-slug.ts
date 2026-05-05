import slugify from "@sindresorhus/slugify";

/** Reserved URL segment under `/app`; cannot be used as a group slug. */
export const RESERVED_GROUP_SLUG = "me";

/** URL-safe base slug from display name (ASCII, lowercase, hyphenated). */
export function slugifyGroupName(raw: string): string {
  const candidate = slugify(raw.trim(), {
    separator: "-",
    lowercase: true,
    locale: "sv",
  });
  return candidate.length > 0 ? candidate : "grupp";
}

export function isReservedGroupSlug(slug: string): boolean {
  return slug === RESERVED_GROUP_SLUG;
}
