import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  parseOptionalSetListDateFromFormData,
  parseOrderedSetListStepIdsFromFormData,
  parseSetListIdFromFormData,
  parseSetListNameFromFormData,
  parseSetListNoteContentFromFormData,
  parseSetListNoteIdFromFormData,
  parseSetListPieceIdFromFormData,
} from "@/lib/schemas/setlists";

describe.each([
  { parser: parseSetListNameFromFormData, field: "name", message: "Namn krävs" },
  { parser: parseSetListIdFromFormData, field: "setListId", message: "Repertoar saknas" },
  { parser: parseSetListPieceIdFromFormData, field: "setListPieceId", message: "Repertoarpost saknas" },
  { parser: parseSetListNoteIdFromFormData, field: "setListNoteId", message: "Anteckning saknas" },
  // Shared by Performance notes and Running-order notes.
  { parser: parseSetListNoteContentFromFormData, field: "content", message: "Anteckning krävs" },
])("$parser.name", ({ parser, field, message }) => {
  it(`returns the trimmed ${field}`, () => {
    expect(parser(formData({ [field]: "  Vårkonsert  " }))).toBe("Vårkonsert");
  });

  it(`throws ${message} when ${field} is missing or blank`, () => {
    expect(() => parser(formData({}))).toThrow(message);
    expect(() => parser(formData({ [field]: "   " }))).toThrow(message);
  });
});

describe("parseOptionalSetListDateFromFormData", () => {
  it.each<Record<string, string>>([{}, { date: "   " }])("reads %j as no date", (fields) => {
    expect(parseOptionalSetListDateFromFormData(formData(fields))).toBeNull();
  });

  it("parses a valid date", () => {
    expect(parseOptionalSetListDateFromFormData(formData({ date: "2026-04-28" }))?.toISOString()).toContain(
      "2026-04-28",
    );
  });

  it("throws Ogiltigt datum for an invalid date", () => {
    expect(() => parseOptionalSetListDateFromFormData(formData({ date: "inte-ett-datum" }))).toThrow("Ogiltigt datum");
  });
});

describe("parseOrderedSetListStepIdsFromFormData", () => {
  it.each([
    [
      ["  a  ", "b", "c"],
      ["a", "b", "c"],
    ],
    [
      ["a", 42, "   ", "b"],
      ["a", "b"],
    ],
  ])("reads %j as %j, dropping non-string and blank entries", (ids, expected) => {
    expect(parseOrderedSetListStepIdsFromFormData(formData({ orderedSetListStepIds: JSON.stringify(ids) }))).toEqual(
      expected,
    );
  });

  it.each([
    [{}, "Ny ordning saknas"],
    [{ orderedSetListStepIds: "   " }, "Ny ordning saknas"],
    [{ orderedSetListStepIds: "not-json" }, "Ogiltig ordning"],
    [{ orderedSetListStepIds: "{}" }, "Ogiltig ordning"],
    [{ orderedSetListStepIds: JSON.stringify([42, "   "]) }, "Ogiltig ordning"],
  ])("refuses %j with %s", (fields, message) => {
    expect(() => parseOrderedSetListStepIdsFromFormData(formData(fields))).toThrow(message);
  });
});
