import { describe, expect, it } from "vitest";

import { SetListSequence } from "@/lib/setlists/sequence";
import type { SetListSequenceStep } from "@/lib/setlists/types";

function step(kind: "piece" | "note", id: string, position: number): SetListSequenceStep {
  return { kind, id, position };
}

describe("SetListSequence.nextPosition", () => {
  it("returns 1 for an empty set list", () => {
    expect(SetListSequence.nextPosition(null, null)).toBe(1);
  });

  it("returns one past the highest piece position", () => {
    expect(SetListSequence.nextPosition(3, null)).toBe(4);
  });

  it("returns one past the highest note position", () => {
    expect(SetListSequence.nextPosition(null, 5)).toBe(6);
  });

  it("returns one past whichever of the two is higher", () => {
    expect(SetListSequence.nextPosition(2, 7)).toBe(8);
    expect(SetListSequence.nextPosition(7, 2)).toBe(8);
  });
});

describe("SetListSequence.positionsAfterRemoval", () => {
  it("compacts a gap left by a removed step, across both kinds", () => {
    const remaining = [step("piece", "A", 1), step("note", "N", 2), step("piece", "B", 4)];
    expect(SetListSequence.positionsAfterRemoval(remaining)).toEqual([
      { kind: "piece", id: "B", position: 3 },
    ]);
  });

  it("returns no updates when positions are already contiguous", () => {
    const remaining = [step("piece", "A", 1), step("note", "N", 2)];
    expect(SetListSequence.positionsAfterRemoval(remaining)).toEqual([]);
  });

  it("returns no updates for an empty set list", () => {
    expect(SetListSequence.positionsAfterRemoval([])).toEqual([]);
  });

  it("does not assume input is pre-sorted", () => {
    const remaining = [step("piece", "B", 4), step("piece", "A", 1), step("note", "N", 2)];
    expect(SetListSequence.positionsAfterRemoval(remaining)).toEqual([
      { kind: "piece", id: "B", position: 3 },
    ]);
  });
});

describe("SetListSequence.positionsAfterReorder", () => {
  it("renumbers every step whose position moved, including a note interleaved between pieces", () => {
    // Ticket scenario: piece A(1), note N(2), piece B(3) — move B above A.
    const steps = [step("piece", "A", 1), step("note", "N", 2), step("piece", "B", 3)];
    const updates = SetListSequence.positionsAfterReorder(steps, ["B", "A", "N"]);
    expect(updates).toEqual(
      expect.arrayContaining([
        { kind: "piece", id: "B", position: 1 },
        { kind: "piece", id: "A", position: 2 },
        { kind: "note", id: "N", position: 3 },
      ])
    );
    expect(updates).toHaveLength(3);
  });

  it("moves a note relative to pieces", () => {
    const steps = [step("piece", "A", 1), step("piece", "B", 2), step("note", "N", 3)];
    const updates = SetListSequence.positionsAfterReorder(steps, ["N", "A", "B"]);
    expect(updates).toEqual(
      expect.arrayContaining([
        { kind: "note", id: "N", position: 1 },
        { kind: "piece", id: "A", position: 2 },
        { kind: "piece", id: "B", position: 3 },
      ])
    );
    expect(updates).toHaveLength(3);
  });

  it("returns no updates when the order is unchanged", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(SetListSequence.positionsAfterReorder(steps, ["A", "N"])).toEqual([]);
  });

  it("throws when the ordered ids omit a step", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(() => SetListSequence.positionsAfterReorder(steps, ["A"])).toThrow("Ogiltig ordning");
  });

  it("throws when the ordered ids contain a duplicate", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(() => SetListSequence.positionsAfterReorder(steps, ["A", "A"])).toThrow(
      "Ogiltig ordning"
    );
  });

  it("throws when the ordered ids reference an unknown step", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(() => SetListSequence.positionsAfterReorder(steps, ["A", "X"])).toThrow(
      "Ogiltig ordning"
    );
  });
});
