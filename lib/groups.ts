/**
 * Whether a Member holding the `MANAGE_MEMBERS` Claim may change this Member's
 * Claims or remove them. The server rejects changes to the Creator and to the
 * viewer's own membership.
 */
export function canChangeMember(
  member: { id: string; isCreator: boolean },
  viewerUserId: string
): boolean {
  return !member.isCreator && member.id !== viewerUserId;
}

export type MyGroupAction = "members" | "edit" | "delete";

/**
 * What a User can do with one of their Groups from My groups, in display order:
 * open its members page (with the `MANAGE_MEMBERS` Claim), and rename or delete
 * it (only the Creator).
 */
export function myGroupActions(group: {
  isCreator: boolean;
  canManageMembers: boolean;
}): MyGroupAction[] {
  if (!group.canManageMembers) {
    return [];
  }
  return group.isCreator ? ["members", "edit", "delete"] : ["members"];
}
