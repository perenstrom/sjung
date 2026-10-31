import { describe, expect, it } from "vitest";

import {
  filterPeople,
  mergePeople,
  shouldOfferCreatePerson,
} from "@/lib/people/person-options";

const people = [
  { id: "1", name: "Anna Andersson" },
  { id: "2", name: "Björn Berg" },
  { id: "3", name: "Åsa Ek" },
];

describe("filterPeople", () => {
  it("returns every person for an empty or whitespace-only query", () => {
    expect(filterPeople(people, "")).toEqual(people);
    expect(filterPeople(people, "   ")).toEqual(people);
  });

  it("keeps people whose name contains the trimmed query, ignoring case", () => {
    expect(filterPeople(people, "  BERG ")).toEqual([
      { id: "2", name: "Björn Berg" },
    ]);
    expect(filterPeople(people, "åsa")).toEqual([{ id: "3", name: "Åsa Ek" }]);
  });

  it("returns no one when nothing matches", () => {
    expect(filterPeople(people, "Cecilia")).toEqual([]);
  });
});

describe("shouldOfferCreatePerson", () => {
  it("offers to create a person when no one matches the typed name exactly", () => {
    expect(shouldOfferCreatePerson(people, "Cecilia")).toBe(true);
    // "Anna" only partially matches "Anna Andersson", so it may be a different person.
    expect(shouldOfferCreatePerson(people, "Anna")).toBe(true);
  });

  it("hides the option when an existing person matches exactly, ignoring case and surrounding whitespace", () => {
    expect(shouldOfferCreatePerson(people, "Björn Berg")).toBe(false);
    expect(shouldOfferCreatePerson(people, "  björn berg ")).toBe(false);
    expect(shouldOfferCreatePerson(people, "ÅSA EK")).toBe(false);
  });

  it("hides the option for an empty or whitespace-only query", () => {
    expect(shouldOfferCreatePerson(people, "")).toBe(false);
    expect(shouldOfferCreatePerson(people, "   ")).toBe(false);
  });

  it("offers to create the first person in a group with no people", () => {
    expect(shouldOfferCreatePerson([], "Anna")).toBe(true);
  });
});

describe("mergePeople", () => {
  it("adds newly created people in name order", () => {
    expect(
      mergePeople(people, [
        { id: "4", name: "Cecilia Dahl" },
        { id: "5", name: "Örjan Ö" },
      ]).map((person) => person.name)
    ).toEqual(["Anna Andersson", "Björn Berg", "Cecilia Dahl", "Åsa Ek", "Örjan Ö"]);
  });

  it("lists a created person once after it also arrives in the refreshed people list", () => {
    const created = { id: "4", name: "Cecilia Dahl" };
    expect(mergePeople([...people, created], [created])).toHaveLength(4);
  });
});
