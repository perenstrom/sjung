/**
 * A Piece's detail page. Links from a Set list pass `fromSetListId`, so the
 * Piece's breadcrumb leads back to that Set list.
 */
export function pieceHref(
  groupSlug: string,
  pieceId: string,
  { fromSetListId }: { fromSetListId?: string } = {}
): string {
  const href = `/app/${groupSlug}/pieces/${pieceId}`;
  if (!fromSetListId) return href;
  return `${href}?${new URLSearchParams({ setlist: fromSetListId })}`;
}
