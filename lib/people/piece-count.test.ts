import { describe, expect, it } from "vitest";

import { formatPieceCount } from "@/lib/people/piece-count";

describe("formatPieceCount", () => {
  it.each([
    [0, "0 stycken"],
    [1, "1 stycke"],
    [2, "2 stycken"],
  ])("says %i Pieces as %s", (count, expected) => {
    expect(formatPieceCount(count)).toBe(expected);
  });
});
