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
  it("returns a trimmed string for a required field", () => {
    const formData = createFormData({ title: "  Hej  " });
    expect(readRequiredString(formData, "title", "Saknas")).toBe("Hej");
  });

  it("throws when a required field is missing or empty", () => {
    const formData = createFormData({ title: "   " });
    expect(() => readRequiredString(formData, "title", "Saknas")).toThrow("Saknas");
  });
});

describe("readOptionalString", () => {
  it("returns null for an empty optional string", () => {
    const formData = createFormData({ note: "   " });
    expect(readOptionalString(formData, "note")).toBeNull();
  });

  it("returns a trimmed optional string", () => {
    const formData = createFormData({ note: "  anteckning  " });
    expect(readOptionalString(formData, "note")).toBe("anteckning");
  });
});

describe("readOptionalDate", () => {
  it("returns null when the date field is missing", () => {
    const formData = createFormData({});
    expect(readOptionalDate(formData, "date", "Ogiltigt datum")).toBeNull();
  });

  it("parses a valid date", () => {
    const formData = createFormData({ date: "2026-04-28" });
    const parsed = readOptionalDate(formData, "date", "Ogiltigt datum");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toContain("2026-04-28");
  });

  it("throws for an invalid date", () => {
    const formData = createFormData({ date: "inte-ett-datum" });
    expect(() => readOptionalDate(formData, "date", "Ogiltigt datum")).toThrow(
      "Ogiltigt datum"
    );
  });
});

describe("field helpers", () => {
  it("reads groupSlug with the default error message", () => {
    const formData = createFormData({ groupSlug: "demo-grupp" });
    expect(readGroupSlugInput(formData)).toBe("demo-grupp");
  });

  it("reads an id field and throws when it is missing", () => {
    const formData = createFormData({ pieceId: "piece-1" });
    expect(readIdField(formData, "pieceId", "Saknar id")).toBe("piece-1");
    expect(() => readIdField(formData, "songId", "Saknar id")).toThrow("Saknar id");
  });
});
