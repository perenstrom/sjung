import { describe, expect, it } from "vitest";

import {
  parsePersonNameFromFormData,
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
  personNameSchema,
  writableGroupSlugSchema,
} from "@/lib/schemas/people";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("personNameSchema", () => {
  it("accepts a trimmed non-empty name", () => {
    expect(personNameSchema.parse("  Anna  ")).toBe("Anna");
  });

  it("rejects empty and whitespace-only values with Namn krävs", () => {
    expect(() => personNameSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Namn krävs" }),
        ]),
      })
    );
    expect(() => personNameSchema.parse("   ")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Namn krävs" }),
        ]),
      })
    );
  });
});

describe("writableGroupSlugSchema", () => {
  it("accepts a trimmed non-empty slug", () => {
    expect(writableGroupSlugSchema.parse("  my-group  ")).toBe("my-group");
  });

  it("rejects empty and whitespace-only values with Saknar grupp", () => {
    expect(() => writableGroupSlugSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Saknar grupp" }),
        ]),
      })
    );
    expect(() => writableGroupSlugSchema.parse("   ")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Saknar grupp" }),
        ]),
      })
    );
  });
});

describe("parsePersonNameFromFormData", () => {
  it("parses name from FormData", () => {
    const fd = createFormData({ name: "  Bo  " });
    expect(parsePersonNameFromFormData(fd)).toBe("Bo");
  });

  it("throws Namn krävs when name is missing or empty", () => {
    expect(() => parsePersonNameFromFormData(createFormData({}))).toThrow(
      "Namn krävs"
    );
    expect(() =>
      parsePersonNameFromFormData(createFormData({ name: "  " }))
    ).toThrow("Namn krävs");
  });
});

describe("parseWritableGroupSlugFromFormData", () => {
  it("parses groupSlug from FormData", () => {
    const fd = createFormData({ groupSlug: "  choir-1  " });
    expect(parseWritableGroupSlugFromFormData(fd)).toBe("choir-1");
  });

  it("throws Saknar grupp when groupSlug is missing or empty", () => {
    expect(() =>
      parseWritableGroupSlugFromFormData(createFormData({}))
    ).toThrow("Saknar grupp");
    expect(() =>
      parseWritableGroupSlugFromFormData(createFormData({ groupSlug: "  " }))
    ).toThrow("Saknar grupp");
  });
});

describe("parseWritableGroupSlugParam", () => {
  it("returns trimmed slug", () => {
    expect(parseWritableGroupSlugParam("  slug  ")).toBe("slug");
  });

  it("throws Saknar grupp for empty or whitespace-only input", () => {
    expect(() => parseWritableGroupSlugParam("")).toThrow("Saknar grupp");
    expect(() => parseWritableGroupSlugParam("   ")).toThrow("Saknar grupp");
  });
});
