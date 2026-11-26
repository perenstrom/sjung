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

/** A Credit with its Person's name, as the display functions take it. */
const personCredit = (personId: string, name: string, role: string) => ({
  personId,
  role,
  person: { name },
});

describe("assertNoDuplicateCredits", () => {
  it.each([
    ["an empty list", []],
    [
      "unique personId/role pairs",
      [
        { personId: "person-1", role: "Kompositör" },
        { personId: "person-1", role: "Textförfattare" },
        { personId: "person-2", role: "Kompositör" },
      ],
    ],
  ])("does not throw for %s", (_case, credits) => {
    expect(() => assertNoDuplicateCredits(credits)).not.toThrow();
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
  const pair = (personId: string, role: string) => ({ personId, role });

  it.each([
    {
      case: "nothing when current and next are identical",
      current: [pair("person-1", "Kompositör")],
      next: [pair("person-1", "Kompositör")],
      creditsToCreate: [],
      creditsToDelete: [],
    },
    {
      case: "everything as new when current is empty",
      current: [],
      next: [pair("person-1", "Kompositör")],
      creditsToCreate: [pair("person-1", "Kompositör")],
      creditsToDelete: [],
    },
    {
      case: "everything as removed when next is empty",
      current: [pair("person-1", "Kompositör")],
      next: [],
      creditsToCreate: [],
      creditsToDelete: [pair("person-1", "Kompositör")],
    },
    {
      case: "only the rows that are new or removed",
      current: [pair("person-1", "Kompositör"), pair("person-2", "Textförfattare")],
      next: [pair("person-1", "Kompositör"), pair("person-3", "Arrangör")],
      creditsToCreate: [pair("person-3", "Arrangör")],
      creditsToDelete: [pair("person-2", "Textförfattare")],
    },
    {
      case: "a role change for the same person as a delete plus a create",
      current: [pair("person-1", "Kompositör")],
      next: [pair("person-1", "Arrangör")],
      creditsToCreate: [pair("person-1", "Arrangör")],
      creditsToDelete: [pair("person-1", "Kompositör")],
    },
  ])("returns $case", ({ current, next, creditsToCreate, creditsToDelete }) => {
    expect(diffCredits(current, next)).toEqual({ creditsToCreate, creditsToDelete });
  });
});

describe("groupCreditsByPerson", () => {
  it.each([
    { case: "an empty list unchanged", credits: [], expected: [] },
    {
      case: "a Person with a single role as one entry",
      credits: [personCredit("p1", "Anna", "Arrangör")],
      expected: [{ personId: "p1", name: "Anna", roles: ["Arrangör"] }],
    },
    {
      case: "each Person once, with their roles in Credit role order",
      credits: [
        personCredit("p1", "Anna", "Textförfattare"),
        personCredit("p1", "Anna", "Kompositör"),
        personCredit("p1", "Anna", "Arrangör"),
      ],
      expected: [{ personId: "p1", name: "Anna", roles: ["Arrangör", "Kompositör", "Textförfattare"] }],
    },
    {
      case: "unknown roles after known roles, sorted alphabetically",
      credits: [
        personCredit("p1", "Anna", "Ösats"),
        personCredit("p1", "Anna", "Textförfattare"),
        personCredit("p1", "Anna", "Annan roll"),
      ],
      expected: [{ personId: "p1", name: "Anna", roles: ["Textförfattare", "Annan roll", "Ösats"] }],
    },
    {
      case: "two Persons with the same name apart",
      credits: [personCredit("p1", "Anna", "Kompositör"), personCredit("p2", "Anna", "Textförfattare")],
      expected: [
        { personId: "p1", name: "Anna", roles: ["Kompositör"] },
        { personId: "p2", name: "Anna", roles: ["Textförfattare"] },
      ],
    },
  ])("shows $case", ({ credits, expected }) => {
    expect(groupCreditsByPerson(credits)).toEqual(expected);
  });

  it.each([
    {
      case: "by their highest-ranked role, regardless of input order",
      credits: [
        personCredit("p1", "Anna", "Textförfattare"),
        personCredit("p2", "Bertil", "Annan roll"),
        personCredit("p3", "Cecilia", "Arrangör"),
        personCredit("p4", "David", "Textförfattare"),
        personCredit("p4", "David", "Kompositör"),
      ],
      names: ["Cecilia", "David", "Anna", "Bertil"],
    },
    {
      case: "with the same highest role by name using Swedish collation",
      credits: [
        personCredit("p1", "Östen", "Kompositör"),
        personCredit("p2", "anna", "Kompositör"),
        personCredit("p3", "Bertil", "Kompositör"),
        personCredit("p3", "Bertil", "Textförfattare"),
      ],
      names: ["anna", "Bertil", "Östen"],
    },
    {
      case: "holding only unknown roles alphabetically by that role",
      credits: [personCredit("p1", "Anna", "Ösats"), personCredit("p2", "Bertil", "Annan roll")],
      names: ["Bertil", "Anna"],
    },
  ])("orders people $case", ({ credits, names }) => {
    expect(groupCreditsByPerson(credits).map((p) => p.name)).toEqual(names);
  });
});

describe("groupCreditsByPiece", () => {
  const credit = (pieceId: string, name: string, role: string) => ({
    pieceId,
    role,
    piece: { name, slug: `${pieceId}-slug` },
  });

  it("lists each Piece once, with the Person's roles in Credit role order", () => {
    const credits = [
      credit("ave", "Ave Maria", "Textförfattare"),
      credit("ave", "Ave Maria", "Övrigt"),
      credit("ave", "Ave Maria", "Arrangör"),
    ];

    expect(groupCreditsByPiece(credits)).toEqual([
      { pieceId: "ave", slug: "ave-slug", name: "Ave Maria", roles: ["Arrangör", "Textförfattare", "Övrigt"] },
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

  it.each([
    ["every Credit role the Person holds", "person-1", ["Kompositör", "Textförfattare"]],
    ["nothing for a Person without Credits", "person-3", []],
    ["nothing when no Person is chosen", "", []],
  ])("returns %s", (_case, personId, roles) => {
    expect(creditRolesHeldBy(credits, personId)).toEqual(new Set(roles));
  });
});

describe("resolveCreditsToSubmit", () => {
  const staged = [
    { personId: "person-1", role: "Kompositör" },
    { personId: "person-2", role: "Arrangör" },
  ];

  it.each([
    { case: "no credits when nothing is staged or picked", staged: [], draft: EMPTY_CREDIT_DRAFT, credits: [] },
    { case: "the staged credits when nothing is picked", staged, draft: EMPTY_CREDIT_DRAFT, credits: staged },
    {
      case: "one more Credit per role for a picked Person and roles not added yet",
      staged,
      draft: { personId: "person-3", roles: ["Textförfattare", "Arrangör"] },
      credits: [
        ...staged,
        { personId: "person-3", role: "Textförfattare" },
        { personId: "person-3", role: "Arrangör" },
      ],
    },
  ])("returns $case", ({ staged, draft, credits }) => {
    expect(resolveCreditsToSubmit(staged, draft)).toEqual({ credits });
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
  it.each([
    { case: "is empty for a piece without credits", credits: [], line: "" },
    {
      case: "lists each Person once with their Credit roles, in display order",
      credits: [
        personCredit("p2", "Bo", "Arrangör"),
        personCredit("p1", "Ann", "Textförfattare"),
        personCredit("p1", "Ann", "Kompositör"),
      ],
      line: "Bo (Arrangör) · Ann (Kompositör, Textförfattare)",
    },
  ])("$case", ({ credits, line }) => {
    expect(formatCreditsLine(credits)).toBe(line);
  });
});
