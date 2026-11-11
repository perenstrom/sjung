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
   * Create, edit or delete any of the Group's content (ADR-0004). Depends only
   * on the Member, never on the content row. Every Member has it for now:
   * PER-305 narrows it to the Creator or `MANAGE_CONTENT`.
   */
  | "manageContent"
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
  | "targetIsSelf"
  | "targetIsCreator";

/** What one Member's access is derived from. Never stored. */
export type GroupAccessFacts = {
  userId: string;
  creatorId: string;
  claims: readonly GroupClaim[];
};

/** `null` when the Member has the capability, otherwise why not. */
export function groupAccessDenial(
  facts: GroupAccessFacts,
  capability: GroupCapability
): GroupAccessDenial | null {
  const isCreator = facts.userId === facts.creatorId;
  const managesMembers = isCreator || facts.claims.includes(GroupClaim.MANAGE_MEMBERS);

  if (capability === "manageMembers") {
    return managesMembers ? null : "lacksManageMembers";
  }
  if (capability === "manageContent") {
    return null;
  }
  if (capability === "manageGroup") {
    return isCreator ? null : "lacksManageGroup";
  }
  if (!managesMembers) {
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
