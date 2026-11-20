import { describe, expect, it } from "vitest";

import { findSameNamedPerson } from "@/lib/people/same-name";

const PEOPLE = [
  { id: "hugo", name: "Hugo Alfvén" },
  { id: "anna", name: "Anna Åström" },
];

describe("findSameNamedPerson", () => {
  it.each([
    ["the exact name", "Hugo Alfvén", "hugo"],
    ["a name differing only in letter case and spacing", "  hugo   ALFVÉN ", "hugo"],
    ["a name differing in an accent", "Anna Aström", undefined],
    ["a different name", "Wilhelm Peterson-Berger", undefined],
    ["an empty name", "   ", undefined],
  ])("for %s finds %s", (_case, name, expectedId) => {
    expect(findSameNamedPerson(name, PEOPLE)?.id).toBe(expectedId);
  });

  it("does not count the Person being renamed as a match for itself", () => {
    expect(findSameNamedPerson("hugo alfvén", PEOPLE, "hugo")).toBeUndefined();
  });
});
