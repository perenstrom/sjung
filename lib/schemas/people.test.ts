import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  parsePersonNameFromFormData,
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";

describe.each([
  { parser: parsePersonNameFromFormData, field: "name", message: "Namn krävs" },
  { parser: parseWritableGroupSlugFromFormData, field: "groupSlug", message: "Saknar grupp" },
])("$parser.name", ({ parser, field, message }) => {
  it(`returns the trimmed ${field}`, () => {
    expect(parser(formData({ [field]: "  Anna  " }))).toBe("Anna");
  });

  it(`throws ${message} when ${field} is missing or blank`, () => {
    expect(() => parser(formData({}))).toThrow(message);
    expect(() => parser(formData({ [field]: "   " }))).toThrow(message);
  });
});

describe("parseWritableGroupSlugParam", () => {
  it("returns the trimmed route param", () => {
    expect(parseWritableGroupSlugParam("  slug  ")).toBe("slug");
  });

  it.each(["", "   "])("throws Saknar grupp for %j", (slug) => {
    expect(() => parseWritableGroupSlugParam(slug)).toThrow("Saknar grupp");
  });
});
