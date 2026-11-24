/** Content with its own page, linked by its Slug (ADR-0011). */
type Slugged = { slug: string };

/**
 * A Piece's detail page. Links from a Set list pass `fromSetListId`, so the
 * Piece's breadcrumb leads back to that Set list.
 */
export function pieceHref(
  groupSlug: string,
  piece: Slugged,
  { fromSetListId }: { fromSetListId?: string } = {},
): string {
  const href = `/app/${groupSlug}/pieces/${piece.slug}`;
  if (!fromSetListId) return href;
  return `${href}?${new URLSearchParams({ setlist: fromSetListId })}`;
}

/**
 * A File's download: a route that redirects to a short-lived signed URL. It is
 * a plain link target, so the tap itself opens the new tab; iOS Safari blocks
 * tabs opened after an await (PER-415).
 */
export function fileDownloadHref(groupSlug: string, file: Slugged): string {
  return `/app/${groupSlug}/files/${file.slug}`;
}

/**
 * The player, open on one of the Piece's Playable Files (see CONTEXT.md).
 * Opened from a Set list piece, it passes `fromSetListPieceId`, so the player
 * offers that Set list piece's Files and closes back to its Set list.
 */
export function playerHref(
  groupSlug: string,
  piece: Slugged,
  file: Slugged,
  { fromSetListPieceId }: { fromSetListPieceId?: string } = {},
): string {
  const href = `${pieceHref(groupSlug, piece)}/play/${file.slug}`;
  if (!fromSetListPieceId) return href;
  return `${href}?${new URLSearchParams({ setlistpiece: fromSetListPieceId })}`;
}
