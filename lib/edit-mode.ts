import type { GroupAccess, GroupCapability } from "@/lib/group-access";

/** A Group capability that an edit control on a page can need. */
export type EditCapability = Extract<
  GroupCapability,
  "manageContent" | "reorderSetLists" | "manageRunningOrderNotes" | "manageGroupHome"
>;

/** What an edit control needs unless it says otherwise. */
export const MANAGE_CONTENT_CAPABILITIES: readonly EditCapability[] = ["manageContent"];

/** What the move buttons in a Set list need: either capability allows reordering (ADR-0012). */
export const REORDER_SET_LIST_CAPABILITIES: readonly EditCapability[] = ["reorderSetLists", "manageContent"];

/** What adding, editing and deleting a Running-order note need: either capability allows it (ADR-0012). */
export const RUNNING_ORDER_NOTE_CAPABILITIES: readonly EditCapability[] = ["manageRunningOrderNotes", "manageContent"];

/** What changing the Group description needs: only its own capability, never `manageContent`. */
export const GROUP_HOME_CAPABILITIES: readonly EditCapability[] = ["manageGroupHome"];

/** What a Set list's step actions need: any of the capabilities behind its move, edit and remove controls. */
export const SET_LIST_STEP_CAPABILITIES: readonly EditCapability[] = [
  ...new Set([...REORDER_SET_LIST_CAPABILITIES, ...RUNNING_ORDER_NOTE_CAPABILITIES]),
];

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
