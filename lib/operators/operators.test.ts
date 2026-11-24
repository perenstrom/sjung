import { afterEach, describe, expect, it, vi } from "vitest";
import { isOperator } from "@/lib/operators/operators";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isOperator", () => {
  it.each([
    ["listed", "anna@example.com", "anna@example.com", true],
    [
      "listed among others, in another case and with spaces",
      " bo@example.com , ANNA@Example.com ",
      "anna@example.com",
      true,
    ],
    ["not listed", "bo@example.com", "anna@example.com", false],
    ["only a part of a listed address", "anna@example.com.evil", "anna@example.com", false],
    ["the list is empty", "", "anna@example.com", false],
    ["the list is only separators", " , ", "anna@example.com", false],
  ])("is %s", (_label, list, email, expected) => {
    vi.stubEnv("OPERATORS_EMAIL", list);
    expect(isOperator({ email })).toBe(expected);
  });

  it("is false for everyone when OPERATORS_EMAIL is not set", () => {
    vi.stubEnv("OPERATORS_EMAIL", undefined);
    expect(isOperator({ email: "anna@example.com" })).toBe(false);
  });
});
