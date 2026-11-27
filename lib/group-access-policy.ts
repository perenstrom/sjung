import { GroupClaim } from "@/app/generated/prisma/enums";

/*
 * The pure rules behind Group access. Only `lib/group-access.ts` imports this
 * file; everyone else asks a loaded `GroupAccess` instead.
 */

/** Something a User may or may not do in one Group. */
export type GroupCapability =
  /**
   * Open the members page and list the Members with their Claims: the Creator,
   * `MANAGE_MEMBERS` or `MANAGE_MEMBER_AUTHORIZATION` (ADR-0013).
   */
  | "viewMembers"
  /** Invite people and handle the Group's Invitations: the Creator or `MANAGE_MEMBERS`. */
  | "manageMembers"
  /**
   * Create, edit or delete any of the Group's content (ADR-0004): the Creator
   * or `MANAGE_CONTENT`. Depends only on the Member, never on the content row.
   */
  | "manageContent"
  /**
   * Change the order of the steps in any of the Group's Set lists (ADR-0012):
   * the Creator or `REORDER_SET_LISTS`. Not implied by `manageContent`; an
   * action that allows reordering accepts either.
   */
  | "reorderSetLists"
  /**
   * Add, edit and delete the Running-order notes in any of the Group's Set
   * lists (ADR-0012): the Creator or `MANAGE_RUNNING_ORDER_NOTES`. Not implied
   * by `manageContent`; an action on a Running-order note accepts either.
   */
  | "manageRunningOrderNotes"
  /**
   * Change Home's own content, the Group description and the Cover image:
   * the Creator or `MANAGE_GROUP_HOME`. Never part of `manageContent`, so it
   * alone allows it.
   */
  | "manageGroupHome"
  /** Rename or delete the Group: the Creator only. */
  | "manageGroup"
  /**
   * Create Roles, and see the controls for changing them: the Creator or
   * `MANAGE_MEMBER_AUTHORIZATION` (ADR-0013).
   */
  | "manageRoles"
  /**
   * Rename, change the Claims of or delete one Role: `manageRoles`, and the
   * viewer doesn't hold that Role. The Creator holds no Roles, so may change any.
   */
  | ChangeRole
  /** Remove one Member: `manageMembers`, and the target is neither the Creator nor the viewer. */
  | RemoveMember
  /**
   * Grant or revoke any Claim on one Member (ADR-0013): the Creator or
   * `MANAGE_MEMBER_AUTHORIZATION`, and the target is neither the Creator nor the viewer.
   */
  | ChangeMemberClaims
  /** Give or take Roles on one Member: the same rule as {@link ChangeMemberClaims}. */
  | ChangeMemberRoles;

export type ChangeRole = { capability: "changeRole"; roleId: string };
export type RemoveMember = { capability: "removeMember"; targetUserId: string };
export type ChangeMemberClaims = { capability: "changeMemberClaims"; targetUserId: string };
export type ChangeMemberRoles = { capability: "changeMemberRoles"; targetUserId: string };

export function changeRole(roleId: string): ChangeRole {
  return { capability: "changeRole", roleId };
}

export function removeMember(targetUserId: string): RemoveMember {
  return { capability: "removeMember", targetUserId };
}

export function changeMemberClaims(targetUserId: string): ChangeMemberClaims {
  return { capability: "changeMemberClaims", targetUserId };
}

export function changeMemberRoles(targetUserId: string): ChangeMemberRoles {
  return { capability: "changeMemberRoles", targetUserId };
}

/** Why a capability was refused. */
export type GroupAccessDenial =
  | "lacksManageMembers"
  | "lacksManageMemberAuthorization"
  | "lacksManageGroup"
  | "lacksManageContent"
  | "lacksReorderSetLists"
  | "lacksManageRunningOrderNotes"
  | "lacksManageGroupHome"
  | "targetIsSelf"
  | "targetIsCreator"
  | "roleIsHeld";

/** What one Member's access is derived from. Never stored. */
export type GroupAccessFacts = {
  userId: string;
  creatorId: string;
  /** Every Claim the Member holds, individually or through any of their Roles. */
  claims: readonly GroupClaim[];
  /** The Roles the Member holds. */
  roleIds: readonly string[];
};

/** `null` when the Member has the capability, otherwise why not. */
export function groupAccessDenial(facts: GroupAccessFacts, capability: GroupCapability): GroupAccessDenial | null {
  const isCreator = facts.userId === facts.creatorId;
  const holds = (claim: GroupClaim) => isCreator || facts.claims.includes(claim);

  if (capability === "viewMembers") {
    // Refused as lacking MANAGE_MEMBERS: its message ("hantera medlemmar") fits a
    // viewer holding neither member Claim.
    return holds(GroupClaim.MANAGE_MEMBERS) || holds(GroupClaim.MANAGE_MEMBER_AUTHORIZATION)
      ? null
      : "lacksManageMembers";
  }
  if (capability === "manageMembers") {
    return holds(GroupClaim.MANAGE_MEMBERS) ? null : "lacksManageMembers";
  }
  if (capability === "manageContent") {
    return holds(GroupClaim.MANAGE_CONTENT) ? null : "lacksManageContent";
  }
  if (capability === "reorderSetLists") {
    return holds(GroupClaim.REORDER_SET_LISTS) ? null : "lacksReorderSetLists";
  }
  if (capability === "manageRunningOrderNotes") {
    return holds(GroupClaim.MANAGE_RUNNING_ORDER_NOTES) ? null : "lacksManageRunningOrderNotes";
  }
  if (capability === "manageGroupHome") {
    return holds(GroupClaim.MANAGE_GROUP_HOME) ? null : "lacksManageGroupHome";
  }
  if (capability === "manageGroup") {
    return isCreator ? null : "lacksManageGroup";
  }
  if (capability === "manageRoles") {
    return holds(GroupClaim.MANAGE_MEMBER_AUTHORIZATION) ? null : "lacksManageMemberAuthorization";
  }

  // Every remaining capability needs one of the member Claims: removing needs
  // MANAGE_MEMBERS, everything about Claims and Roles MANAGE_MEMBER_AUTHORIZATION.
  if (capability.capability === "removeMember") {
    if (!holds(GroupClaim.MANAGE_MEMBERS)) return "lacksManageMembers";
  } else if (!holds(GroupClaim.MANAGE_MEMBER_AUTHORIZATION)) {
    return "lacksManageMemberAuthorization";
  }
  if (capability.capability === "changeRole") {
    return facts.roleIds.includes(capability.roleId) ? "roleIsHeld" : null;
  }
  if (capability.targetUserId === facts.userId) {
    return "targetIsSelf";
  }
  if (capability.targetUserId === facts.creatorId) {
    return "targetIsCreator";
  }
  return null;
}
