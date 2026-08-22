import { describe, expect, it } from "vitest";

import { assertNoDuplicateCredits, diffCredits, DUPLICATE_CREDITS_ERROR } from "@/lib/pieces/credits";

describe("assertNoDuplicateCredits", () => {
  it("does not throw for an empty list", () => {
    expect(() => assertNoDuplicateCredits([])).not.toThrow();
  });

  it("does not throw when personId/role pairs are unique", () => {
    expect(() =>
      assertNoDuplicateCredits([
        { personId: "person-1", role: "Kompositör" },
        { personId: "person-1", role: "Textförfattare" },
        { personId: "person-2", role: "Kompositör" },
      ])
    ).not.toThrow();
  });

  it("throws when the same personId/role pair appears twice", () => {
    expect(() =>
      assertNoDuplicateCredits([
        { personId: "person-1", role: "Kompositör" },
        { personId: "person-1", role: "Kompositör" },
      ])
    ).toThrow(DUPLICATE_CREDITS_ERROR);
  });
});

describe("diffCredits", () => {
  it("returns empty create/delete lists when current and next are identical", () => {
    const credits = [{ personId: "person-1", role: "Kompositör" }];
    expect(diffCredits(credits, credits)).toEqual({
      creditsToCreate: [],
      creditsToDelete: [],
    });
  });

  it("returns everything as creditsToCreate when current is empty", () => {
    const next = [{ personId: "person-1", role: "Kompositör" }];
    expect(diffCredits([], next)).toEqual({
      creditsToCreate: next,
      creditsToDelete: [],
    });
  });

  it("returns everything as creditsToDelete when next is empty", () => {
    const current = [{ personId: "person-1", role: "Kompositör" }];
    expect(diffCredits(current, [])).toEqual({
      creditsToCreate: [],
      creditsToDelete: current,
    });
  });

  it("only creates rows that are new and only deletes rows that were removed", () => {
    const current = [
      { personId: "person-1", role: "Kompositör" },
      { personId: "person-2", role: "Textförfattare" },
    ];
    const next = [
      { personId: "person-1", role: "Kompositör" },
      { personId: "person-3", role: "Arrangör" },
    ];

    expect(diffCredits(current, next)).toEqual({
      creditsToCreate: [{ personId: "person-3", role: "Arrangör" }],
      creditsToDelete: [{ personId: "person-2", role: "Textförfattare" }],
    });
  });

  it("treats a role change for the same person as a delete plus a create", () => {
    const current = [{ personId: "person-1", role: "Kompositör" }];
    const next = [{ personId: "person-1", role: "Arrangör" }];

    expect(diffCredits(current, next)).toEqual({
      creditsToCreate: [{ personId: "person-1", role: "Arrangör" }],
      creditsToDelete: [{ personId: "person-1", role: "Kompositör" }],
    });
  });
});
