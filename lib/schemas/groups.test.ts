import { describe, expect, it } from "vitest";

import {
  groupIdSchema,
  groupNameSchema,
  inviteEmailSchema,
  memberUserIdSchema,
  membershipGroupSlugSchema,
  parseGroupIdFromFormData,
  parseGroupNameFromFormData,
  parseInviteEmailFromFormData,
  parseMemberUserIdFromFormData,
  parseMembershipGroupSlugFromFormData,
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

describe("membershipGroupSlugSchema", () => {
  it("accepts trimmed non-empty slug", () => {
    expect(membershipGroupSlugSchema.parse("  my-slug  ")).toBe("my-slug");
  });

  it("rejects empty with Ogiltig grupp", () => {
    expect(() => membershipGroupSlugSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Ogiltig grupp" }),
        ]),
      })
    );
    expect(() => membershipGroupSlugSchema.parse("   ")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Ogiltig grupp" }),
        ]),
      })
    );
  });
});

describe("inviteEmailSchema", () => {
  it("trims and lowercases", () => {
    expect(inviteEmailSchema.parse("  User@EXAMPLE.com  ")).toBe(
      "user@example.com"
    );
  });

  it("rejects empty with E-post krävs", () => {
    expect(() => inviteEmailSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "E-post krävs" }),
        ]),
      })
    );
    expect(() => inviteEmailSchema.parse("   ")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "E-post krävs" }),
        ]),
      })
    );
  });
});

describe("memberUserIdSchema", () => {
  it("accepts trimmed non-empty string without UUID format", () => {
    expect(memberUserIdSchema.parse("  not-a-uuid  ")).toBe("not-a-uuid");
  });

  it("rejects empty with Ogiltig medlem", () => {
    expect(() => memberUserIdSchema.parse("")).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ message: "Ogiltig medlem" }),
        ]),
      })
    );
  });
});

describe("parseMembershipGroupSlugFromFormData", () => {
  it("parses groupSlug", () => {
    const fd = createFormData({ groupSlug: "  choir-1  " });
    expect(parseMembershipGroupSlugFromFormData(fd)).toBe("choir-1");
  });

  it("throws Ogiltig grupp when missing or blank", () => {
    expect(() => parseMembershipGroupSlugFromFormData(createFormData({}))).toThrow(
      "Ogiltig grupp"
    );
    expect(() =>
      parseMembershipGroupSlugFromFormData(
        createFormData({ groupSlug: "   " })
      )
    ).toThrow("Ogiltig grupp");
  });
});

describe("parseInviteEmailFromFormData", () => {
  it("parses email with trim and lowercase", () => {
    const fd = createFormData({ email: "  A@B.C  " });
    expect(parseInviteEmailFromFormData(fd)).toBe("a@b.c");
  });

  it("throws E-post krävs when missing or blank", () => {
    expect(() => parseInviteEmailFromFormData(createFormData({}))).toThrow(
      "E-post krävs"
    );
    expect(() =>
      parseInviteEmailFromFormData(createFormData({ email: "  " }))
    ).toThrow("E-post krävs");
  });
});

describe("parseMemberUserIdFromFormData", () => {
  it("parses memberUserId with trim", () => {
    const fd = createFormData({
      memberUserId: "  550e8400-e29b-41d4-a716-446655440000  ",
    });
    expect(parseMemberUserIdFromFormData(fd)).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("throws Ogiltig medlem when missing or blank", () => {
    expect(() => parseMemberUserIdFromFormData(createFormData({}))).toThrow(
      "Ogiltig medlem"
    );
    expect(() =>
      parseMemberUserIdFromFormData(createFormData({ memberUserId: "  " }))
    ).toThrow("Ogiltig medlem");
  });
});
