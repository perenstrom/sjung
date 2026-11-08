import { describe, expect, it } from "vitest";
import {
  DIALOG_STICKY_CLEARANCE_PX,
  dialogFrame,
  revealScrollDelta,
} from "./dialogFrame";

describe("dialogFrame", () => {
  it("pins the dialog 16px from the top of the visible area", () => {
    expect(dialogFrame({ height: 812, offsetTop: 0 }).top).toBe(16);
  });

  it("caps the height to the visible area minus a 16px inset top and bottom", () => {
    expect(dialogFrame({ height: 812, offsetTop: 0 }).maxHeight).toBe(780);
  });

  it("follows the visible area when the keyboard pans it down", () => {
    expect(dialogFrame({ height: 400, offsetTop: 250 })).toEqual({
      top: 266,
      maxHeight: 368,
    });
  });

  it("never returns a negative height", () => {
    expect(dialogFrame({ height: 20, offsetTop: 0 }).maxHeight).toBe(0);
  });
});

describe("revealScrollDelta", () => {
  const body = { top: 16, bottom: 364 };

  it("leaves the body alone when the field is clear of the sticky rows", () => {
    expect(revealScrollDelta({ top: 150, bottom: 194 }, body)).toBe(0);
  });

  it("scrolls down so a field hidden under the action row clears it", () => {
    expect(revealScrollDelta({ top: 320, bottom: 364 }, body)).toBe(
      364 - (364 - DIALOG_STICKY_CLEARANCE_PX),
    );
  });

  it("scrolls up so a field hidden under the title row clears it", () => {
    expect(revealScrollDelta({ top: 20, bottom: 64 }, body)).toBe(
      20 - (16 + DIALOG_STICKY_CLEARANCE_PX),
    );
  });

  it("puts the top of a block taller than the clear area just under the title row", () => {
    // e.g. the inline person picker: its search field first, then its results.
    expect(revealScrollDelta({ top: 300, bottom: 600 }, body)).toBe(
      300 - (16 + DIALOG_STICKY_CLEARANCE_PX),
    );
  });

  it("leaves a tall block alone when its top already sits under the title row", () => {
    expect(
      revealScrollDelta({ top: 16 + DIALOG_STICKY_CLEARANCE_PX, bottom: 600 }, body),
    ).toBe(0);
  });
});
