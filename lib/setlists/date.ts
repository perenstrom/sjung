/**
 * Formats a set list date for display, or returns null when it has none, so
 * each view decides how to show a missing date (a "–" cell in tables, no
 * secondary line in the mobile list).
 */
export function formatSetListDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}
