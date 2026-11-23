/**
 * Whether the open player was reached from a list of Files in this tab, so
 * the entry before it in the history is that list. Kept in memory only: a
 * reload or a shared link starts without it.
 */
let openedFromList = false;

/** Called as a File row opens the player. */
export function noteOpenedFromList() {
  openedFromList = true;
}

/**
 * Closes the player: back to the list it was opened from, so that back from
 * there doesn't reopen it, or else to `closeHref` (the Piece, or the Set list
 * the player's URL says it was opened from).
 */
export function closePlayer(router: { back(): void; replace(href: string): void }, closeHref: string) {
  if (openedFromList) {
    openedFromList = false;
    router.back();
  } else {
    router.replace(closeHref);
  }
}
