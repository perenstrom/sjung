/**
 * Formats a date for display as an ISO-style Swedish date, or returns null
 * when there is none, so each view decides how to show a missing date (a "–"
 * cell in tables, no secondary line in the mobile list).
 */
export function formatDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}
