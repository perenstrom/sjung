/** My groups: where a User lists, creates, renames and deletes their Groups. */
export const MY_GROUPS_PATH = "/app/me/groups";

/** A Group's own address, where its Home is, so links that take a User "into a Group" point here. */
export function groupPath(groupSlug: string): string {
  return `/app/${groupSlug}`;
}

/** Alla noter: the Group's Piece catalog. */
export function groupPiecesPath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/pieces`;
}

/** Upphovspersoner. */
export function groupPeoplePath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/people`;
}

/** One Person's page, by Slug: the Pieces they are credited on. */
export function groupPersonPath(groupSlug: string, person: { slug: string }): string {
  return `${groupPeoplePath(groupSlug)}/${person.slug}`;
}

/** Repertoarer: the Group's Set lists. */
export function groupSetListsPath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/setlists`;
}

/** One Set list's page, by Slug. */
export function groupSetListPath(groupSlug: string, setList: { slug: string }): string {
  return `${groupSetListsPath(groupSlug)}/${setList.slug}`;
}

/** Medlemmar. */
export function groupMembersPath(groupSlug: string): string {
  return `${groupPath(groupSlug)}/members`;
}
