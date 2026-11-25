import { GroupClaim } from "@/app/generated/prisma/enums";

/*
 * The pure rules behind Group access. Only `lib/group-access.ts` imports this
 * file; everyone else asks a loaded `GroupAccess` instead.
 */

/** Something a User may or may not do in one Group. */
export type GroupCapability =
  /** Invite, list and remove Members, and set their Claims: the Creator or `MANAGE_MEMBERS`. */
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
  /** Rename or delete the Group: the Creator only. */
  | "manageGroup"
  /** Change or remove one Member: `manageMembers`, and the target is neither the Creator nor the viewer. */
  | ChangeMember;

export type ChangeMember = { capability: "changeMember"; targetUserId: string };

export function changeMember(targetUserId: string): ChangeMember {
  return { capability: "changeMember", targetUserId };
}

/** Why a capability was refused. */
export type GroupAccessDenial =
  | "lacksManageMembers"
  | "lacksManageGroup"
  | "lacksManageContent"
  | "lacksReorderSetLists"
  | "lacksManageRunningOrderNotes"
  | "targetIsSelf"
  | "targetIsCreator";

/** What one Member's access is derived from. Never stored. */
export type GroupAccessFacts = {
  userId: string;
  creatorId: string;
  claims: readonly GroupClaim[];
};

/** `null` when the Member has the capability, otherwise why not. */
export function groupAccessDenial(facts: GroupAccessFacts, capability: GroupCapability): GroupAccessDenial | null {
  const isCreator = facts.userId === facts.creatorId;
  const holds = (claim: GroupClaim) => isCreator || facts.claims.includes(claim);

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
  if (capability === "manageGroup") {
    return isCreator ? null : "lacksManageGroup";
  }
  if (!holds(GroupClaim.MANAGE_MEMBERS)) {
    return "lacksManageMembers";
  }
  if (capability.targetUserId === facts.userId) {
    return "targetIsSelf";
  }
  if (capability.targetUserId === facts.creatorId) {
    return "targetIsCreator";
  }
  return null;
}
