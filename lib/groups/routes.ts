/** My groups: where a User lists, creates, renames and deletes their Groups. */
export const MY_GROUPS_PATH = "/app/me/groups";

/**
 * A Group's own address. It redirects to the Group's start page, so links
 * that take a User "into a Group" point here.
 */
export function groupPath(groupSlug: string): string {
  return `/app/${groupSlug}`;
}

/** Noter: the Group's Piece catalog. */
export function groupPiecesPath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/pieces`;
}

/** Personer. */
export function groupPeoplePath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/people`;
}

/** Repertoarer: the Group's Set lists, and its start page. */
export function groupSetListsPath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/setlists`;
}

/** One Set list's page. */
export function groupSetListPath(groupSlug: string, setListId: string): string {
  return `${groupSetListsPath(groupSlug)}/${setListId}`;
}

/** Medlemmar. */
export function groupMembersPath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/members`;
}
