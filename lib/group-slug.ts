import { slugifyName } from "@/lib/slug";

/**
 * URL segments directly under `/app` that belong to the app rather than to a
 * Group, so no Group can take them as its slug. URLs are in English. Beyond
 * those in use, this blocks words we may want for app-wide pages later, since
 * a Group that took one first would leave us unable to use it.
 */
export const RESERVED_GROUP_SLUGS: ReadonlySet<string> = new Set([
  // In use.
  "me",
  "news",
  "operator",
  // App-wide pages we may add.
  "about",
  "account",
  "admin",
  "api",
  "app",
  "auth",
  "calendar",
  "dashboard",
  "export",
  "feedback",
  "groups",
  "help",
  "home",
  "import",
  "inbox",
  "invitation",
  "invitations",
  "login",
  "logout",
  "manage",
  "messages",
  "new",
  "notifications",
  "profile",
  "search",
  "settings",
  "sjung",
  "start",
  "stats",
  "status",
  "support",
  "system",
]);

/** URL-safe base slug from display name (ASCII, lowercase, hyphenated). */
export function slugifyGroupName(raw: string): string {
  return slugifyName(raw, "grupp");
}

export function isReservedGroupSlug(slug: string): boolean {
  return RESERVED_GROUP_SLUGS.has(slug);
}
