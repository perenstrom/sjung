/** Shown instead of an author whose User has been deleted (ADR-0006). */
export const DELETED_USER_NAME = "Borttagen användare";

/** Who to show as the author of content, given their name, or `null` once their User is deleted. */
export function authorName(name: string | null): string {
  return name ?? DELETED_USER_NAME;
}
