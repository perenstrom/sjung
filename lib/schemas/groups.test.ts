import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  inviteEmailSchema,
  parseGroupClaimsFromFormData,
  parseGroupDescriptionFromFormData,
  parseGroupNameFromFormData,
  parseGroupSlugFromFormData,
  parseMemberUserIdFromFormData,
} from "@/lib/schemas/groups";

describe.each([
  { parser: parseGroupNameFromFormData, field: "name", message: "Gruppnamn krävs" },
  { parser: parseGroupSlugFromFormData, field: "groupSlug", message: "Ogiltig grupp" },
  // A member's id is any non-blank string, not necessarily a UUID.
  { parser: parseMemberUserIdFromFormData, field: "memberUserId", message: "Ogiltig medlem" },
])("$parser.name", ({ parser, field, message }) => {
  it(`returns the trimmed ${field}`, () => {
    expect(parser(formData({ [field]: "  not-a-uuid  " }))).toBe("not-a-uuid");
  });

  it(`throws ${message} when ${field} is missing or blank`, () => {
    expect(() => parser(formData({}))).toThrow(message);
    expect(() => parser(formData({ [field]: "   " }))).toThrow(message);
  });
});

// Inviting a Member parses the typed address with the schema itself.
describe("inviteEmailSchema", () => {
  it("trims and lowercases", () => {
    expect(inviteEmailSchema.parse("  User@EXAMPLE.com  ")).toBe("user@example.com");
  });

  it.each([
    ["", "E-post krävs"],
    ["   ", "E-post krävs"],
    ["inte en adress", "Ange en giltig e-postadress"],
  ])("rejects %j with %s", (email, message) => {
    expect(inviteEmailSchema.safeParse(email).error?.issues[0]?.message).toBe(message);
  });
});

describe("parseGroupClaimsFromFormData", () => {
  function claimsFormData(claims: string[]): FormData {
    const fd = new FormData();
    for (const claim of claims) {
      fd.append("claims", claim);
    }
    return fd;
  }

  it.each([
    [[], []],
    [
      ["MANAGE_CONTENT", "MANAGE_MEMBERS", "MANAGE_CONTENT"],
      ["MANAGE_CONTENT", "MANAGE_MEMBERS"],
    ],
  ])("reads %j as the Claim set %j, dropping duplicates", (claims, expected) => {
    expect(parseGroupClaimsFromFormData(claimsFormData(claims))).toEqual(expected);
  });

  it("throws Ogiltig behörighet when any value is not a known Claim", () => {
    expect(() => parseGroupClaimsFromFormData(claimsFormData(["MANAGE_MEMBERS", "ADMIN"]))).toThrow(
      "Ogiltig behörighet",
    );
  });
});

describe("parseGroupDescriptionFromFormData", () => {
  it("counts a posted CRLF line break as one character, as the textarea's maxLength does", () => {
    const description = "a\r\n".repeat(GROUP_DESCRIPTION_MAX_LENGTH / 2 - 1) + "ab";

    expect(parseGroupDescriptionFromFormData(formData({ description }))).toHaveLength(GROUP_DESCRIPTION_MAX_LENGTH);
  });
});
