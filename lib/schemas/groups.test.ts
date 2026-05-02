import { describe, expect, it } from "vitest";

import {
  groupIdSchema,
  groupNameSchema,
  parseGroupIdFromFormData,
  parseGroupNameFromFormData,
} from "@/lib/schemas/groups";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("groupNameSchema", () => {
  it("accepts a trimmed non-empty name", () => {
    expect(groupNameSchema.parse("  Min grupp  ")).toBe("Min grupp");
  });

  it("rejects empty and whitespace-only values with Gruppnamn krävs", () => {
    expect(() => groupNameSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Gruppnamn krävs" }),
        ]),
      })
    );
    expect(() => groupNameSchema.parse("   ")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Gruppnamn krävs" }),
        ]),
      })
    );
  });
});

describe("groupIdSchema", () => {
  it("accepts a valid UUID", () => {
    expect(
      groupIdSchema.parse("550e8400-e29b-41d4-a716-446655440000")
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects invalid ids with Ogiltig grupp", () => {
    expect(() => groupIdSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Ogiltig grupp" }),
        ]),
      })
    );
    expect(() => groupIdSchema.parse("not-a-uuid")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Ogiltig grupp" }),
        ]),
      })
    );
  });
});

describe("parseGroupNameFromFormData", () => {
  it("parses name from FormData", () => {
    const fd = createFormData({ name: "  Test  " });
    expect(parseGroupNameFromFormData(fd)).toBe("Test");
  });

  it("throws Gruppnamn krävs when name is missing or empty", () => {
    expect(() => parseGroupNameFromFormData(createFormData({}))).toThrow(
      "Gruppnamn krävs"
    );
    expect(() =>
      parseGroupNameFromFormData(createFormData({ name: "  " }))
    ).toThrow("Gruppnamn krävs");
  });
});

describe("parseGroupIdFromFormData", () => {
  it("parses id from FormData", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const fd = createFormData({ id });
    expect(parseGroupIdFromFormData(fd)).toBe(id);
  });

  it("throws Ogiltig grupp for invalid id", () => {
    expect(() =>
      parseGroupIdFromFormData(createFormData({ id: "x" }))
    ).toThrow("Ogiltig grupp");
  });
});
