import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  parseCreditPersonIdFromFormData,
  parseCreditRolesFromFormData,
  parseLinkIdFromFormData,
  parseOptionalLinkLabelFromFormData,
  parsePieceCreditsFromFormData,
  parsePieceIdFromFormData,
  parsePieceNameFromFormData,
  parseRequiredHttpUrlFromFormData,
} from "@/lib/schemas/pieces";

const INVALID_CREDITS = "Ogiltigt format för upphovspersoner";

describe.each([
  { parser: parsePieceNameFromFormData, field: "name", message: "Namn krävs" },
  { parser: parsePieceIdFromFormData, field: "pieceId", message: "Stycke saknas" },
  { parser: parseLinkIdFromFormData, field: "linkId", message: "Länk saknas" },
])("$parser.name", ({ parser, field, message }) => {
  it(`returns the trimmed ${field}`, () => {
    expect(parser(formData({ [field]: "  Sång  " }))).toBe("Sång");
  });

  it(`throws ${message} when ${field} is missing or blank`, () => {
    expect(() => parser(formData({}))).toThrow(message);
    expect(() => parser(formData({ [field]: "   " }))).toThrow(message);
  });
});

describe("parseRequiredHttpUrlFromFormData", () => {
  it.each([
    ["http://example.com/path", "http://example.com/path"],
    ["  https://example.com/sheet  ", "https://example.com/sheet"],
  ])("accepts %j", (url, href) => {
    expect(parseRequiredHttpUrlFromFormData(formData({ url })).href).toBe(href);
  });

  it.each([
    [{}, "Länk krävs"],
    [{ url: "   " }, "Länk krävs"],
    [{ url: "not a url" }, "Ogiltig länk"],
    [{ url: "ftp://x.com" }, "Länk måste börja med http eller https"],
  ])("refuses %j with %s", (fields, message) => {
    expect(() => parseRequiredHttpUrlFromFormData(formData(fields))).toThrow(message);
  });
});

describe("parseOptionalLinkLabelFromFormData", () => {
  it.each([
    [{}, null],
    [{ label: "  " }, null],
    [{ label: "  Partitur  " }, "Partitur"],
  ])("reads %j as %j", (fields, expected) => {
    expect(parseOptionalLinkLabelFromFormData(formData(fields))).toBe(expected);
  });
});

describe("parsePieceCreditsFromFormData", () => {
  const personIdA = "11111111-1111-4111-8111-111111111111";
  const personIdB = "22222222-2222-4222-8222-222222222222";

  it.each<Record<string, string>>([{}, { credits: "   " }])("reads %j as no Credits", (fields) => {
    expect(parsePieceCreditsFromFormData(formData(fields))).toEqual([]);
  });

  it("parses a JSON list of Credits", () => {
    const credits = [
      { personId: personIdA, role: "Kompositör" },
      { personId: personIdB, role: "Textförfattare" },
    ];

    expect(parsePieceCreditsFromFormData(formData({ credits: JSON.stringify(credits) }))).toEqual(credits);
  });

  it.each([
    ["invalid JSON", "not-json", INVALID_CREDITS],
    ["JSON that is not a list", "{}", INVALID_CREDITS],
    [
      "a personId that is not a UUID",
      JSON.stringify([{ personId: "not-a-uuid", role: "Kompositör" }]),
      INVALID_CREDITS,
    ],
    ["a Credit role that is blank once trimmed", JSON.stringify([{ personId: personIdA, role: "  " }]), "Roll krävs"],
  ])("refuses %s", (_case, credits, message) => {
    expect(() => parsePieceCreditsFromFormData(formData({ credits }))).toThrow(message);
  });
});

describe("parseCreditPersonIdFromFormData", () => {
  it("returns the personId when it is a UUID", () => {
    const personId = "11111111-1111-4111-8111-111111111111";

    expect(parseCreditPersonIdFromFormData(formData({ personId }))).toBe(personId);
  });

  it.each<Record<string, string>>([{}, { personId: "not-a-uuid" }])(`refuses %j with ${INVALID_CREDITS}`, (fields) => {
    expect(() => parseCreditPersonIdFromFormData(formData(fields))).toThrow(INVALID_CREDITS);
  });
});

describe("parseCreditRolesFromFormData", () => {
  const parse = (roles: unknown) => parseCreditRolesFromFormData(formData({ roles: JSON.stringify(roles) }));

  it("returns every Credit role, trimmed", () => {
    expect(parse([" Producent ", "Kompositör"])).toEqual(["Producent", "Kompositör"]);
  });

  it.each([
    ["no Credit roles", [], "Välj minst en roll"],
    ["an empty Credit role", ["Kompositör", "  "], "Roll krävs"],
    [
      "a Credit role longer than 50 characters once trimmed",
      [` ${"x".repeat(51)} `],
      "Rollen får vara högst 50 tecken",
    ],
    ["a value that is not a list", "Kompositör", INVALID_CREDITS],
  ])("throws for %s", (_case, roles, message) => {
    expect(() => parse(roles)).toThrow(message);
  });

  it("throws when the field is missing", () => {
    expect(() => parseCreditRolesFromFormData(formData({}))).toThrow(INVALID_CREDITS);
  });
});
