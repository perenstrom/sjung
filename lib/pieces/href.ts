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

/** The Set list a Piece link carries (its `setlist` search param), if any. */
export function fromSetListIdParam(setlist: string | string[] | undefined): string | undefined {
  return typeof setlist === "string" && setlist !== "" ? setlist : undefined;
}

/**
 * A File's download: a route that redirects to a short-lived signed URL. It is
 * a plain link target, so the tap itself opens the new tab; iOS Safari blocks
 * tabs opened after an await (PER-415).
 */
export function fileDownloadHref(groupSlug: string, fileId: string): string {
  return `/app/${groupSlug}/files/${fileId}`;
}

/** The player, open on one of the Piece's Playable Files (see CONTEXT.md). */
export function playerHref(groupSlug: string, pieceId: string, fileId: string): string {
  return `${pieceHref(groupSlug, pieceId)}/play/${fileId}`;
}
