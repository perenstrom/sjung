import { describe, expect, it } from "vitest";

import {
  compareCreditRoles,
  creditRoleSuggestions,
  rankCreditRoles,
  resolveCreditRole,
  shouldOfferNewCreditRole,
} from "@/lib/pieces/credit-roles";

describe("resolveCreditRole", () => {
  it.each([
    ["a built-in role, ignoring case and spacing", "  kompositör ", [], "Kompositör"],
    ["a role already used in the Group", "dirigent", ["Dirigent"], "Dirigent"],
    ["a used role with different inner spacing", "körledare  i  tjänst", ["Körledare i tjänst"], "Körledare i tjänst"],
  ])("uses the existing spelling of %s", (_case, typed, groupRoles, expected) => {
    expect(resolveCreditRole(typed, groupRoles)).toBe(expected);
  });

  it("keeps a new role as typed, trimmed and with runs of whitespace collapsed", () => {
    expect(resolveCreditRole("  Ljud\t tekniker ", ["Dirigent"])).toBe("Ljud tekniker");
  });
});

describe("rankCreditRoles", () => {
  it("is exactly the built-in roles for a Group without credits", () => {
    expect(rankCreditRoles([])).toEqual(["Arrangör", "Kompositör", "Textförfattare"]);
  });

  it("lists the built-in roles first, then the Group's other roles alphabetically, each once", () => {
    expect(rankCreditRoles(["Översättare", "Kompositör", "Dirigent", "Åsikt", "Dirigent"])).toEqual([
      "Arrangör",
      "Kompositör",
      "Textförfattare",
      "Dirigent",
      "Åsikt",
      "Översättare",
    ]);
  });

  it("keeps one spelling of roles that differ only in case or spacing", () => {
    expect(rankCreditRoles(["Dirigent", "dirigent ", "kompositör"])).toEqual([
      "Arrangör",
      "Kompositör",
      "Textförfattare",
      "Dirigent",
    ]);
  });
});

describe("compareCreditRoles", () => {
  it("ranks Arrangör, Kompositör, Textförfattare, then other roles in Swedish order", () => {
    expect(["Översättare", "Textförfattare", "Annan roll", "Kompositör", "Arrangör"].sort(compareCreditRoles)).toEqual([
      "Arrangör",
      "Kompositör",
      "Textförfattare",
      "Annan roll",
      "Översättare",
    ]);
  });
});

describe("creditRoleSuggestions", () => {
  const roles = ["Arrangör", "Kompositör", "Textförfattare", "Dirigent"];

  it("suggests every role for an empty query", () => {
    expect(creditRoleSuggestions(roles, "  ")).toEqual(roles);
  });

  it("keeps roles containing the query anywhere, ignoring case", () => {
    expect(creditRoleSuggestions(roles, "RIG")).toEqual(["Dirigent"]);
    expect(creditRoleSuggestions(roles, "för")).toEqual(["Textförfattare"]);
  });
});

describe("shouldOfferNewCreditRole", () => {
  const roles = ["Arrangör", "Kompositör", "Textförfattare", "Dirigent"];

  it.each([
    ["empty text", "   ", false],
    ["a role ignoring case and spacing", "  dirigent ", false],
    ["only part of a role", "Dirig", true],
    ["a new role", "Ljudtekniker", true],
  ])("for %s is %s", (_case, query, expected) => {
    expect(shouldOfferNewCreditRole(roles, query)).toBe(expected);
  });
});
