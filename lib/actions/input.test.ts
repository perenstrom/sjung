import { describe, expect, it } from "vitest";

import {
  readGroupSlugInput,
  readIdField,
  readOptionalDate,
  readOptionalString,
  readRequiredString,
} from "@/lib/actions/input";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("readRequiredString", () => {
  it("returnerar trimmad sträng för obligatoriskt fält", () => {
    const formData = createFormData({ title: "  Hej  " });
    expect(readRequiredString(formData, "title", "Saknas")).toBe("Hej");
  });

  it("kastar fel när obligatoriskt fält saknas eller är tomt", () => {
    const formData = createFormData({ title: "   " });
    expect(() => readRequiredString(formData, "title", "Saknas")).toThrow("Saknas");
  });
});

describe("readOptionalString", () => {
  it("returnerar null för tom optional sträng", () => {
    const formData = createFormData({ note: "   " });
    expect(readOptionalString(formData, "note")).toBeNull();
  });

  it("returnerar trimmad optional sträng", () => {
    const formData = createFormData({ note: "  anteckning  " });
    expect(readOptionalString(formData, "note")).toBe("anteckning");
  });
});

describe("readOptionalDate", () => {
  it("returnerar null när datumfältet saknas", () => {
    const formData = createFormData({});
    expect(readOptionalDate(formData, "date", "Ogiltigt datum")).toBeNull();
  });

  it("parsar giltigt datum", () => {
    const formData = createFormData({ date: "2026-04-28" });
    const parsed = readOptionalDate(formData, "date", "Ogiltigt datum");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toContain("2026-04-28");
  });

  it("kastar fel för ogiltigt datum", () => {
    const formData = createFormData({ date: "inte-ett-datum" });
    expect(() => readOptionalDate(formData, "date", "Ogiltigt datum")).toThrow(
      "Ogiltigt datum"
    );
  });
});

describe("fält-helpers", () => {
  it("läser groupSlug med standardfelmeddelande", () => {
    const formData = createFormData({ groupSlug: "demo-grupp" });
    expect(readGroupSlugInput(formData)).toBe("demo-grupp");
  });

  it("läser id-fält och kastar när det saknas", () => {
    const formData = createFormData({ pieceId: "piece-1" });
    expect(readIdField(formData, "pieceId", "Saknar id")).toBe("piece-1");
    expect(() => readIdField(formData, "songId", "Saknar id")).toThrow("Saknar id");
  });
});
