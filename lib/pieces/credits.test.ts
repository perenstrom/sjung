import { describe, expect, it } from "vitest";

import {
  assertNoDuplicateCredits,
  creditRolesHeldBy,
  diffCredits,
  DUPLICATE_CREDITS_ERROR,
  EMPTY_CREDIT_DRAFT,
  formatCreditsLine,
  groupCreditsByPerson,
  MISSING_CREDIT_PERSON_ERROR,
  MISSING_CREDIT_ROLE_ERROR,
  resolveCreditsToSubmit,
} from "@/lib/pieces/credits";

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

describe("groupCreditsByPerson", () => {
  const credit = (personId: string, name: string, role: string) => ({
    personId,
    role,
    person: { name },
  });

  it("returns an empty list unchanged", () => {
    expect(groupCreditsByPerson([])).toEqual([]);
  });

  it("returns a Person with a single role as one entry", () => {
    expect(groupCreditsByPerson([credit("p1", "Anna", "Arrangör")])).toEqual([
      { personId: "p1", name: "Anna", roles: ["Arrangör"] },
    ]);
  });

  it("shows each Person once, with their roles in ROLES order", () => {
    const credits = [
      credit("p1", "Anna", "Textförfattare"),
      credit("p1", "Anna", "Kompositör"),
      credit("p1", "Anna", "Arrangör"),
    ];

    expect(groupCreditsByPerson(credits)).toEqual([
      { personId: "p1", name: "Anna", roles: ["Kompositör", "Arrangör", "Textförfattare"] },
    ]);
  });

  it("places unknown roles after known roles, sorted alphabetically", () => {
    const credits = [
      credit("p1", "Anna", "Ösats"),
      credit("p1", "Anna", "Textförfattare"),
      credit("p1", "Anna", "Annan roll"),
    ];

    expect(groupCreditsByPerson(credits)[0].roles).toEqual([
      "Textförfattare",
      "Annan roll",
      "Ösats",
    ]);
  });

  it("orders people by their highest-ranked role, regardless of input order", () => {
    const credits = [
      credit("p1", "Anna", "Textförfattare"),
      credit("p2", "Bertil", "Annan roll"),
      credit("p3", "Cecilia", "Arrangör"),
      credit("p4", "David", "Textförfattare"),
      credit("p4", "David", "Kompositör"),
    ];

    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual([
      "David",
      "Cecilia",
      "Anna",
      "Bertil",
    ]);
  });

  it("orders people with the same highest role by name using Swedish collation", () => {
    const credits = [
      credit("p1", "Östen", "Kompositör"),
      credit("p2", "anna", "Kompositör"),
      credit("p3", "Bertil", "Kompositör"),
      credit("p3", "Bertil", "Arrangör"),
    ];

    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual([
      "anna",
      "Bertil",
      "Östen",
    ]);
  });

  it("ranks people holding only unknown roles alphabetically by that role", () => {
    const credits = [
      credit("p1", "Anna", "Ösats"),
      credit("p2", "Bertil", "Annan roll"),
    ];

    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual(["Bertil", "Anna"]);
  });

  it("keeps two Persons with the same name apart", () => {
    const credits = [
      credit("p1", "Anna", "Kompositör"),
      credit("p2", "Anna", "Textförfattare"),
    ];

    expect(groupCreditsByPerson(credits)).toEqual([
      { personId: "p1", name: "Anna", roles: ["Kompositör"] },
      { personId: "p2", name: "Anna", roles: ["Textförfattare"] },
    ]);
  });
});

describe("creditRolesHeldBy", () => {
  const credits = [
    { personId: "person-1", role: "Kompositör" },
    { personId: "person-2", role: "Arrangör" },
    { personId: "person-1", role: "Textförfattare" },
  ];

  it("returns every Credit role the Person holds", () => {
    expect(creditRolesHeldBy(credits, "person-1")).toEqual(
      new Set(["Kompositör", "Textförfattare"])
    );
  });

  it("returns an empty set for a Person without Credits", () => {
    expect(creditRolesHeldBy(credits, "person-3")).toEqual(new Set());
  });

  it("returns an empty set when no Person is chosen", () => {
    expect(creditRolesHeldBy(credits, "")).toEqual(new Set());
  });
});

describe("resolveCreditsToSubmit", () => {
  const staged = [
    { personId: "person-1", role: "Kompositör" },
    { personId: "person-2", role: "Arrangör" },
  ];

  it("returns no credits when nothing is staged or picked", () => {
    expect(resolveCreditsToSubmit([], EMPTY_CREDIT_DRAFT)).toEqual({ credits: [] });
  });

  it("returns the staged credits when nothing is picked", () => {
    expect(resolveCreditsToSubmit(staged, EMPTY_CREDIT_DRAFT)).toEqual({ credits: staged });
  });

  it("includes a picked Person and role that were not added yet", () => {
    expect(
      resolveCreditsToSubmit(staged, { personId: "person-3", role: "Textförfattare" })
    ).toEqual({
      credits: [...staged, { personId: "person-3", role: "Textförfattare" }],
    });
  });

  it("asks for a role when only a Person is picked", () => {
    expect(resolveCreditsToSubmit(staged, { personId: "person-3", role: "" })).toEqual({
      error: MISSING_CREDIT_ROLE_ERROR,
    });
  });

  it("asks for a Person when only a role is picked", () => {
    expect(resolveCreditsToSubmit(staged, { personId: "", role: "Kompositör" })).toEqual({
      error: MISSING_CREDIT_PERSON_ERROR,
    });
  });
});

describe("formatCreditsLine", () => {
  const credit = (personId: string, name: string, role: string) => ({
    personId,
    role,
    person: { name },
  });

  it("is empty for a piece without credits", () => {
    expect(formatCreditsLine([])).toBe("");
  });

  it("lists each Person once with their Credit roles, in display order", () => {
    expect(
      formatCreditsLine([
        credit("p2", "Bo", "Arrangör"),
        credit("p1", "Ann", "Textförfattare"),
        credit("p1", "Ann", "Kompositör"),
      ])
    ).toBe("Ann (Kompositör, Textförfattare) · Bo (Arrangör)");
  });
});
