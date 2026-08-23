import { describe, expect, it } from "vitest";

import {
  parseOptionalSetListDateFromFormData,
  parseOrderedSetListStepIdsFromFormData,
  parseSetListIdFromFormData,
  parseSetListNameFromFormData,
  parseSetListNoteContentFromFormData,
  parseSetListNoteIdFromFormData,
  parseSetListPieceIdFromFormData,
  parseSetListPieceNoteContentFromFormData,
  parseSetListPieceNoteIdFromFormData,
} from "@/lib/schemas/setlists";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseSetListNameFromFormData", () => {
  it("returns trimmed name", () => {
    expect(parseSetListNameFromFormData(createFormData({ name: "  Vårkonsert  " }))).toBe(
      "Vårkonsert"
    );
  });

  it("throws Namn krävs when empty", () => {
    expect(() => parseSetListNameFromFormData(createFormData({ name: "  " }))).toThrow(
      "Namn krävs"
    );
  });
});

describe("id field parsers", () => {
  it("returns trimmed setListId and throws Repertoar saknas when empty", () => {
    expect(
      parseSetListIdFromFormData(createFormData({ setListId: "  id-1  " }))
    ).toBe("id-1");
    expect(() => parseSetListIdFromFormData(createFormData({}))).toThrow(
      "Repertoar saknas"
    );
  });

  it("returns trimmed setListPieceId and throws Repertoarpost saknas when empty", () => {
    expect(
      parseSetListPieceIdFromFormData(createFormData({ setListPieceId: "  id-2  " }))
    ).toBe("id-2");
    expect(() => parseSetListPieceIdFromFormData(createFormData({}))).toThrow(
      "Repertoarpost saknas"
    );
  });

  it("returns trimmed setListPieceNoteId and throws Anteckning saknas when empty", () => {
    expect(
      parseSetListPieceNoteIdFromFormData(
        createFormData({ setListPieceNoteId: "  id-3  " })
      )
    ).toBe("id-3");
    expect(() => parseSetListPieceNoteIdFromFormData(createFormData({}))).toThrow(
      "Anteckning saknas"
    );
  });

  it("returns trimmed setListNoteId and throws Anteckning saknas when empty", () => {
    expect(
      parseSetListNoteIdFromFormData(createFormData({ setListNoteId: "  id-4  " }))
    ).toBe("id-4");
    expect(() => parseSetListNoteIdFromFormData(createFormData({}))).toThrow(
      "Anteckning saknas"
    );
  });
});

describe("note content parsers", () => {
  it("returns trimmed content for a set list piece note", () => {
    expect(
      parseSetListPieceNoteContentFromFormData(
        createFormData({ content: "  Kom ihåg tempot  " })
      )
    ).toBe("Kom ihåg tempot");
  });

  it("throws Anteckning krävs when empty", () => {
    expect(() =>
      parseSetListPieceNoteContentFromFormData(createFormData({ content: "  " }))
    ).toThrow("Anteckning krävs");
  });

  it("returns trimmed content for a set list note", () => {
    expect(
      parseSetListNoteContentFromFormData(createFormData({ content: "  Paus  " }))
    ).toBe("Paus");
  });

  it("throws Anteckning krävs when empty", () => {
    expect(() =>
      parseSetListNoteContentFromFormData(createFormData({ content: "" }))
    ).toThrow("Anteckning krävs");
  });
});

describe("parseOptionalSetListDateFromFormData", () => {
  it("returns null when the date field is missing or empty", () => {
    expect(parseOptionalSetListDateFromFormData(createFormData({}))).toBeNull();
    expect(
      parseOptionalSetListDateFromFormData(createFormData({ date: "   " }))
    ).toBeNull();
  });

  it("parses a valid date", () => {
    const parsed = parseOptionalSetListDateFromFormData(
      createFormData({ date: "2026-04-28" })
    );
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toContain("2026-04-28");
  });

  it("throws Ogiltigt datum for an invalid date", () => {
    expect(() =>
      parseOptionalSetListDateFromFormData(createFormData({ date: "inte-ett-datum" }))
    ).toThrow("Ogiltigt datum");
  });
});

describe("parseOrderedSetListStepIdsFromFormData", () => {
  it("throws Ny ordning saknas when missing or empty", () => {
    expect(() => parseOrderedSetListStepIdsFromFormData(createFormData({}))).toThrow(
      "Ny ordning saknas"
    );
    expect(() =>
      parseOrderedSetListStepIdsFromFormData(
        createFormData({ orderedSetListStepIds: "   " })
      )
    ).toThrow("Ny ordning saknas");
  });

  it("throws Ogiltig ordning for invalid JSON", () => {
    expect(() =>
      parseOrderedSetListStepIdsFromFormData(
        createFormData({ orderedSetListStepIds: "not-json" })
      )
    ).toThrow("Ogiltig ordning");
  });

  it("throws Ogiltig ordning for non-array JSON", () => {
    expect(() =>
      parseOrderedSetListStepIdsFromFormData(createFormData({ orderedSetListStepIds: "{}" }))
    ).toThrow("Ogiltig ordning");
  });

  it("parses a valid JSON array of ids", () => {
    const fd = createFormData({
      orderedSetListStepIds: JSON.stringify(["  a  ", "b", "c"]),
    });
    expect(parseOrderedSetListStepIdsFromFormData(fd)).toEqual(["a", "b", "c"]);
  });

  it("drops non-string and blank entries, keeping the rest", () => {
    const fd = createFormData({
      orderedSetListStepIds: JSON.stringify(["a", 42, "   ", "b"]),
    });
    expect(parseOrderedSetListStepIdsFromFormData(fd)).toEqual(["a", "b"]);
  });

  it("throws Ogiltig ordning when every entry is dropped", () => {
    const fd = createFormData({ orderedSetListStepIds: JSON.stringify([42, "   "]) });
    expect(() => parseOrderedSetListStepIdsFromFormData(fd)).toThrow("Ogiltig ordning");
  });
});
