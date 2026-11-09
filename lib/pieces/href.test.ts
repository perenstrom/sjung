import { describe, expect, it } from "vitest";

import { pieceHref } from "@/lib/pieces/href";

describe("pieceHref", () => {
  it("links to the piece", () => {
    expect(pieceHref("kor", "p-1")).toBe("/app/kor/pieces/p-1");
  });

  it("carries the set list it was opened from", () => {
    expect(pieceHref("kor", "p-1", { fromSetListId: "sl-1" })).toBe(
      "/app/kor/pieces/p-1?setlist=sl-1"
    );
  });
});
