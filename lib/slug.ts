import slugify from "@sindresorhus/slugify";

/**
 * URL-safe Slug from a name (ASCII, lowercase, hyphenated), or `fallback` when
 * nothing in the name survives. See CONTEXT.md, "Slug".
 */
export function slugifyName(raw: string, fallback: string): string {
  const candidate = slugify(raw.trim(), {
    separator: "-",
    lowercase: true,
    locale: "sv",
  });
  return candidate.length > 0 ? candidate : fallback;
}

/** `base`, or on a clash the first of `base-2`, `base-3`, … that isn't taken. */
export function firstFreeSlug(base: string, isTaken: (slug: string) => boolean): string {
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!isTaken(slug)) return slug;
  }
}

const STOCKHOLM_DATE = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * An Announcement's Slug before any clash: its publishing date in Stockholm,
 * then its title's Slug (ADR-0011). The date never changes once published.
 */
export function announcementSlug(title: string, publishedAt: Date): string {
  return `${STOCKHOLM_DATE.format(publishedAt)}-${slugifyName(title, "nyhet")}`;
}
