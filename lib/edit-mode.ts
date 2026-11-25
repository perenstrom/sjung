import type { GroupAccess, GroupCapability } from "@/lib/group-access";

/** A Group capability that an edit control on a page can need. */
export type EditCapability = Extract<GroupCapability, "manageContent" | "reorderSetLists">;

/** What the move buttons in a Set list need: either capability allows reordering (ADR-0012). */
export const REORDER_SET_LIST_CAPABILITIES: readonly EditCapability[] = ["reorderSetLists", "manageContent"];

/**
 * The capabilities among `relevant` (those that matter on the page) the
 * Member holds, for `EditModeProvider`. Decided on the server, since a
 * `GroupAccess` doesn't cross to the client.
 */
export function heldEditCapabilities(
  access: GroupAccess | null,
  relevant: readonly EditCapability[],
): EditCapability[] {
  return access ? relevant.filter((capability) => access.can(capability)) : [];
}
