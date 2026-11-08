import { revealScrollDelta } from "@/lib/dialog/dialogFrame";

const REVEAL = "data-dialog-reveal";

/**
 * Marks something larger than a single field that should be seen whole when
 * one of its fields is focused, like the inline person picker. Spread it on
 * the element: `<div {...DIALOG_REVEAL_ATTRIBUTE}>`.
 */
export const DIALOG_REVEAL_ATTRIBUTE = { [REVEAL]: "" };

/**
 * What to bring into view for the focused element: its closest
 * `DIALOG_REVEAL_ATTRIBUTE` ancestor, or the element itself.
 */
export function revealTargetFor(focused: HTMLElement): HTMLElement {
  return focused.closest<HTMLElement>(`[${REVEAL}]`) ?? focused;
}

/**
 * Scrolls the mobile dialog body that holds `element` so the element sits
 * clear of the sticky title and action rows. Does nothing outside a dialog.
 */
export function revealInDialogBody(element: HTMLElement) {
  const body = element.closest<HTMLElement>("[data-slot=dialog-body]");
  if (!body) return;
  body.scrollTop += revealScrollDelta(
    element.getBoundingClientRect(),
    body.getBoundingClientRect(),
  );
}
