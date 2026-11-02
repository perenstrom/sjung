import { describe, expect, it } from "vitest";

import { spanCells } from "./cellSpans";

describe("spanCells", () => {
  it("keeps every cell at span 1 when no cell spans", () => {
    expect(spanCells(["a", "b", "c"], () => 1)).toEqual([
      { cell: "a", colSpan: 1 },
      { cell: "b", colSpan: 1 },
      { cell: "c", colSpan: 1 },
    ]);
  });

  it("skips the cells a spanning cell covers", () => {
    const spans: Record<string, number> = { b: 3 };
    expect(spanCells(["a", "b", "c", "d", "e"], (cell) => spans[cell] ?? 1)).toEqual([
      { cell: "a", colSpan: 1 },
      { cell: "b", colSpan: 3 },
      { cell: "e", colSpan: 1 },
    ]);
  });

  it("clamps a span that would run past the last cell", () => {
    expect(spanCells(["a", "b", "c"], (cell) => (cell === "b" ? 5 : 1))).toEqual([
      { cell: "a", colSpan: 1 },
      { cell: "b", colSpan: 2 },
    ]);
  });

  it("treats spans below 1 as 1", () => {
    expect(spanCells(["a", "b"], () => 0)).toEqual([
      { cell: "a", colSpan: 1 },
      { cell: "b", colSpan: 1 },
    ]);
  });
});
