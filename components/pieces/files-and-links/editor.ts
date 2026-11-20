/**
 * Which editor a Piece's Files and Links have open. Only one is open per
 * Piece at a time, across Files and Links and across Categories, so two
 * forms never change the same Piece at once.
 */
export type EditorTarget =
  | { kind: "addFile" }
  | { kind: "addLink" }
  | { kind: "renameFile"; id: string }
  | { kind: "replaceFile"; id: string }
  | { kind: "editLink"; id: string };

export type OpenEditor = EditorTarget | null;

function isSame(a: EditorTarget, b: EditorTarget): boolean {
  return a.kind === b.kind && ("id" in a ? a.id : null) === ("id" in b ? b.id : null);
}

/** The open editor after `target` opens or closes; opening one closes any other. */
export function nextEditor(open: OpenEditor, target: EditorTarget, opening: boolean): OpenEditor {
  if (opening) {
    return target;
  }
  return open !== null && isSame(open, target) ? null : open;
}

/** Whether `target` is the open editor. */
export function isOpen(open: OpenEditor, target: EditorTarget): boolean {
  return open !== null && isSame(open, target);
}

/**
 * Whether `target`'s control is unavailable because another editor is open.
 * Without a target, whether removing a File or Link is: nothing is removed
 * while an editor is open.
 */
export function isBlocked(open: OpenEditor, target?: EditorTarget): boolean {
  if (open === null) {
    return false;
  }
  return target === undefined || !isSame(open, target);
}
