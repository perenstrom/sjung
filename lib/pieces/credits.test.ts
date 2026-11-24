import { describe, expect, it } from "vitest";

import {
  assertNoDuplicateCredits,
  creditDraftError,
  creditRolesHeldBy,
  creditsFromDraft,
  diffCredits,
  DUPLICATE_CREDITS_ERROR,
  EMPTY_CREDIT_DRAFT,
  formatCreditsLine,
  groupCreditsByPerson,
  groupCreditsByPiece,
  MISSING_CREDIT_FIELDS_ERROR,
  MISSING_CREDIT_PERSON_ERROR,
  MISSING_CREDIT_ROLE_ERROR,
  resolveCreditsToSubmit,
  toggleCreditRole,
  withCreditDraftPerson,
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
      ]),
    ).not.toThrow();
  });

  it("throws when the same personId/role pair appears twice", () => {
    expect(() =>
      assertNoDuplicateCredits([
        { personId: "person-1", role: "Kompositör" },
        { personId: "person-1", role: "Kompositör" },
      ]),
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

  it("shows each Person once, with their roles in Credit role order", () => {
    const credits = [
      credit("p1", "Anna", "Textförfattare"),
      credit("p1", "Anna", "Kompositör"),
      credit("p1", "Anna", "Arrangör"),
    ];

    expect(groupCreditsByPerson(credits)).toEqual([
      { personId: "p1", name: "Anna", roles: ["Arrangör", "Kompositör", "Textförfattare"] },
    ]);
  });

  it("places unknown roles after known roles, sorted alphabetically", () => {
    const credits = [
      credit("p1", "Anna", "Ösats"),
      credit("p1", "Anna", "Textförfattare"),
      credit("p1", "Anna", "Annan roll"),
    ];

    expect(groupCreditsByPerson(credits)[0].roles).toEqual(["Textförfattare", "Annan roll", "Ösats"]);
  });

  it("orders people by their highest-ranked role, regardless of input order", () => {
    const credits = [
      credit("p1", "Anna", "Textförfattare"),
      credit("p2", "Bertil", "Annan roll"),
      credit("p3", "Cecilia", "Arrangör"),
      credit("p4", "David", "Textförfattare"),
      credit("p4", "David", "Kompositör"),
    ];

    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual(["Cecilia", "David", "Anna", "Bertil"]);
  });

  it("orders people with the same highest role by name using Swedish collation", () => {
    const credits = [
      credit("p1", "Östen", "Kompositör"),
      credit("p2", "anna", "Kompositör"),
      credit("p3", "Bertil", "Kompositör"),
      credit("p3", "Bertil", "Textförfattare"),
    ];

    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual(["anna", "Bertil", "Östen"]);
  });

  it("ranks people holding only unknown roles alphabetically by that role", () => {
    const credits = [credit("p1", "Anna", "Ösats"), credit("p2", "Bertil", "Annan roll")];

    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual(["Bertil", "Anna"]);
  });

  it("keeps two Persons with the same name apart", () => {
    const credits = [credit("p1", "Anna", "Kompositör"), credit("p2", "Anna", "Textförfattare")];

    expect(groupCreditsByPerson(credits)).toEqual([
      { personId: "p1", name: "Anna", roles: ["Kompositör"] },
      { personId: "p2", name: "Anna", roles: ["Textförfattare"] },
    ]);
  });
});

describe("groupCreditsByPiece", () => {
  const credit = (pieceId: string, name: string, role: string) => ({
    pieceId,
    role,
    piece: { name },
  });

  it("lists each Piece once, with the Person's roles in Credit role order", () => {
    const credits = [
      credit("ave", "Ave Maria", "Textförfattare"),
      credit("ave", "Ave Maria", "Övrigt"),
      credit("ave", "Ave Maria", "Arrangör"),
    ];

    expect(groupCreditsByPiece(credits)).toEqual([
      { pieceId: "ave", name: "Ave Maria", roles: ["Arrangör", "Textförfattare", "Övrigt"] },
    ]);
  });

  it("orders Pieces by name using Swedish collation, as Alla noter does", () => {
    const credits = [
      credit("p1", "Översten", "Kompositör"),
      credit("p2", "ave maria", "Arrangör"),
      credit("p3", "Bred dina vida vingar", "Textförfattare"),
      credit("p4", "Ännu en", "Kompositör"),
    ];

    expect(groupCreditsByPiece(credits).map((piece) => piece.name)).toEqual([
      "ave maria",
      "Bred dina vida vingar",
      "Ännu en",
      "Översten",
    ]);
  });

  it("keeps two Pieces with the same name apart", () => {
    const credits = [credit("p1", "Kyrie", "Kompositör"), credit("p2", "Kyrie", "Arrangör")];

    expect(
      groupCreditsByPiece(credits)
        .map((piece) => piece.pieceId)
        .sort(),
    ).toEqual(["p1", "p2"]);
  });
});

describe("creditRolesHeldBy", () => {
  const credits = [
    { personId: "person-1", role: "Kompositör" },
    { personId: "person-2", role: "Arrangör" },
    { personId: "person-1", role: "Textförfattare" },
  ];

  it("returns every Credit role the Person holds", () => {
    expect(creditRolesHeldBy(credits, "person-1")).toEqual(new Set(["Kompositör", "Textförfattare"]));
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

  it("includes one Credit per role for a picked Person and roles not added yet", () => {
    expect(resolveCreditsToSubmit(staged, { personId: "person-3", roles: ["Textförfattare", "Arrangör"] })).toEqual({
      credits: [
        ...staged,
        { personId: "person-3", role: "Textförfattare" },
        { personId: "person-3", role: "Arrangör" },
      ],
    });
  });

  it.each([
    ["only a Person", { personId: "person-3", roles: [] }, MISSING_CREDIT_ROLE_ERROR],
    ["only roles", { personId: "", roles: ["Kompositör"] }, MISSING_CREDIT_PERSON_ERROR],
  ])("asks for what is missing when %s is picked", (_case, draft, error) => {
    expect(resolveCreditsToSubmit(staged, draft)).toEqual({ error });
  });
});

describe("creditDraftError", () => {
  it.each([
    ["nothing", EMPTY_CREDIT_DRAFT, MISSING_CREDIT_FIELDS_ERROR],
    ["only a Person", { personId: "person-1", roles: [] }, MISSING_CREDIT_ROLE_ERROR],
    ["only roles", { personId: "", roles: ["Kompositör"] }, MISSING_CREDIT_PERSON_ERROR],
    ["a Person and roles", { personId: "person-1", roles: ["Kompositör"] }, null],
  ])("for %s picked is %j", (_case, draft, error) => {
    expect(creditDraftError(draft)).toBe(error);
  });
});

describe("creditsFromDraft", () => {
  it("makes one Credit per picked role", () => {
    expect(creditsFromDraft({ personId: "person-1", roles: ["Kompositör", "Dirigent"] })).toEqual([
      { personId: "person-1", role: "Kompositör" },
      { personId: "person-1", role: "Dirigent" },
    ]);
  });
});

describe("withCreditDraftPerson", () => {
  const credits = [{ personId: "person-2", role: "Kompositör" }];

  it("drops picked roles the newly picked Person already holds, keeping the rest", () => {
    expect(
      withCreditDraftPerson({ personId: "person-1", roles: ["Kompositör", "Dirigent"] }, credits, "person-2"),
    ).toEqual({ personId: "person-2", roles: ["Dirigent"] });
  });
});

describe("toggleCreditRole", () => {
  it("adds a role that isn't picked and removes one that is", () => {
    expect(toggleCreditRole(["Kompositör"], "Dirigent")).toEqual(["Kompositör", "Dirigent"]);
    expect(toggleCreditRole(["Kompositör", "Dirigent"], "Kompositör")).toEqual(["Dirigent"]);
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
      ]),
    ).toBe("Bo (Arrangör) · Ann (Kompositör, Textförfattare)");
  });
});
