import { describe, expect, it } from "vitest";

import { SetListPositions } from "@/lib/setlists/sequence-positions";
import type { SetListSequenceStep } from "@/lib/setlists/types";

function step(kind: "piece" | "note", id: string, position: number): SetListSequenceStep {
  return { kind, id, position };
}

describe("SetListPositions.nextPosition", () => {
  it("returns 1 for an empty set list", () => {
    expect(SetListPositions.nextPosition(null, null)).toBe(1);
  });

  it("returns one past the highest piece position", () => {
    expect(SetListPositions.nextPosition(3, null)).toBe(4);
  });

  it("returns one past the highest note position", () => {
    expect(SetListPositions.nextPosition(null, 5)).toBe(6);
  });

  it("returns one past whichever of the two is higher", () => {
    expect(SetListPositions.nextPosition(2, 7)).toBe(8);
    expect(SetListPositions.nextPosition(7, 2)).toBe(8);
  });
});

describe("SetListPositions.positionsAfterReorder", () => {
  it("renumbers every step whose position moved, including a note interleaved between pieces", () => {
    // Ticket scenario: piece A(1), note N(2), piece B(3) — move B above A.
    const steps = [step("piece", "A", 1), step("note", "N", 2), step("piece", "B", 3)];
    const updates = SetListPositions.positionsAfterReorder(steps, ["B", "A", "N"]);
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
    const updates = SetListPositions.positionsAfterReorder(steps, ["N", "A", "B"]);
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
    expect(SetListPositions.positionsAfterReorder(steps, ["A", "N"])).toEqual([]);
  });

  it("throws when the ordered ids omit a step", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(() => SetListPositions.positionsAfterReorder(steps, ["A"])).toThrow("Ogiltig ordning");
  });

  it("throws when the ordered ids contain a duplicate", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(() => SetListPositions.positionsAfterReorder(steps, ["A", "A"])).toThrow(
      "Ogiltig ordning"
    );
  });

  it("throws when the ordered ids reference an unknown step", () => {
    const steps = [step("piece", "A", 1), step("note", "N", 2)];
    expect(() => SetListPositions.positionsAfterReorder(steps, ["A", "X"])).toThrow(
      "Ogiltig ordning"
    );
  });
});
