/** Gap kept between a mobile dialog and the edges of the visible area. */
export const DIALOG_INSET_PX = 16;

export type VisibleArea = {
  /** `visualViewport.height`: shrinks when the on-screen keyboard opens. */
  height: number;
  /** `visualViewport.offsetTop`: grows when iOS pans the page above the keyboard. */
  offsetTop: number;
};

export type DialogFrame = {
  /** Distance from the layout viewport's top, for a `position: fixed` dialog. */
  top: number;
  maxHeight: number;
};

/**
 * Where a top-pinned mobile dialog goes so that it stays inside the part of
 * the screen the on-screen keyboard leaves visible.
 */
export function dialogFrame({ height, offsetTop }: VisibleArea): DialogFrame {
  return {
    top: offsetTop + DIALOG_INSET_PX,
    maxHeight: Math.max(height - 2 * DIALOG_INSET_PX, 0),
  };
}

/**
 * Room kept between a revealed field and the scrolling body's edges, so it
 * clears the sticky title row and the tallest action row (two stacked 44px
 * touch buttons plus padding).
 */
export const DIALOG_STICKY_CLEARANCE_PX = 120;

export type VerticalBounds = { top: number; bottom: number };

/**
 * How far to scroll the dialog body so the focused field sits clear of the
 * sticky rows. A field taller than the room between them (such as the inline
 * person picker with its results) gets its top just under the title row, so
 * it is read from its start. Scrolling only the body (not `scrollIntoView`)
 * keeps iOS from panning the visual viewport again.
 */
export function revealScrollDelta(
  field: VerticalBounds,
  body: VerticalBounds,
): number {
  const highest = body.top + DIALOG_STICKY_CLEARANCE_PX;
  const lowest = body.bottom - DIALOG_STICKY_CLEARANCE_PX;
  if (field.bottom - field.top > lowest - highest) return field.top - highest;
  if (field.bottom > lowest) return field.bottom - lowest;
  if (field.top < highest) return field.top - highest;
  return 0;
}
