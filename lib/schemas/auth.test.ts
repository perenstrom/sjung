import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  parseLoginFormData,
  parseNewPasswordFormData,
  parseRedirectPathFromValue,
  parseSignupFormData,
  userNameSchema,
} from "@/lib/schemas/auth";

describe("parseRedirectPathFromValue", () => {
  it.each([
    [undefined, "/app"],
    [null, "/app"],
    ["", "/app"],
    ["https://evil.com", "/app"],
    ["relative", "/app"],
    ["/app", "/app"],
    ["/people", "/people"],
  ])("reads %j as %j: internal paths only, /app otherwise", (value, expected) => {
    expect(parseRedirectPathFromValue(value)).toBe(expected);
  });
});

describe("parseLoginFormData", () => {
  it("trims the email, keeps the password as typed and reads next", () => {
    const result = parseLoginFormData(formData({ email: "  Hi@Example.com ", password: " pw ", next: "/people" }));

    expect(result).toEqual({
      ok: true,
      data: { email: "Hi@Example.com", password: " pw ", redirectTo: "/people" },
    });
  });

  it.each([
    ["the password field is missing", { email: " a@b.com " }, { email: "a@b.com" }],
    ["the email field is missing", { password: "x" }, { email: "" }],
    ["the email is not an address", { email: " oops ", password: "x" }, { email: "oops" }],
    ["the password is empty", { email: "a@b.com", password: "" }, { email: "a@b.com" }],
  ])("fails when %s, echoing back the trimmed email but never the password", (_case, fields, values) => {
    expect(parseLoginFormData(formData(fields))).toEqual({ ok: false, values });
  });
});

describe("parseSignupFormData", () => {
  const valid = {
    name: "Ada",
    email: "ada@example.com",
    password: "123456789012",
    passwordConfirmation: "123456789012",
  };

  it("trims the name and email, keeps one untrimmed copy of the password and reads next", () => {
    // 12 characters only with the leading space: the length rule counts the password as typed.
    const password = " 12345678901";
    const result = parseSignupFormData(
      formData({
        name: "  Ada  ",
        email: " Ada@Example.com ",
        password,
        passwordConfirmation: password,
        next: "/people",
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: { name: "Ada", email: "Ada@Example.com", password, redirectTo: "/people" },
    });
  });

  it.each([
    ["a blank name", { ...valid, name: "   " }, "Namn krävs", { name: "", email: "ada@example.com" }],
    [
      "a short password",
      { ...valid, name: " Ada ", email: " ada@example.com ", password: "short", passwordConfirmation: "short" },
      "Lösenordet måste vara minst 12 tecken",
      { name: "Ada", email: "ada@example.com" },
    ],
    [
      "a short, mismatched password",
      { ...valid, password: "short", passwordConfirmation: "other" },
      "Lösenordet måste vara minst 12 tecken",
      { name: "Ada", email: "ada@example.com" },
    ],
    [
      "mismatched passwords",
      { ...valid, passwordConfirmation: "210987654321" },
      "Lösenorden matchar inte",
      { name: "Ada", email: "ada@example.com" },
    ],
    [
      "a confirmation that differs only by a trailing space",
      { ...valid, passwordConfirmation: "123456789012 " },
      "Lösenorden matchar inte",
      { name: "Ada", email: "ada@example.com" },
    ],
    [
      "an invalid email",
      { ...valid, email: "not-email" },
      "Ogiltiga formulärdata",
      { name: "Ada", email: "not-email" },
    ],
    [
      "a missing password confirmation",
      { name: "Ada", email: "ada@example.com", password: "123456789012" },
      "Ogiltiga formulärdata",
      { name: "Ada", email: "ada@example.com" },
    ],
    ["missing fields", { email: "ada@example.com" }, "Ogiltiga formulärdata", { name: "", email: "ada@example.com" }],
  ])("refuses %s, echoing back the trimmed name and email", (_case, fields, error, values) => {
    expect(parseSignupFormData(formData(fields))).toEqual({ ok: false, error, values });
  });

  it("takes the invited address instead of the submitted email when given one", () => {
    const tampered = parseSignupFormData(formData({ ...valid, email: "inte en adress" }), {
      invitedEmail: "anna@example.com",
    });
    const missing = parseSignupFormData(
      formData({ name: "Anna", password: valid.password, passwordConfirmation: valid.password }),
      { invitedEmail: "anna@example.com" },
    );

    for (const result of [tampered, missing]) {
      expect(result).toMatchObject({ ok: true, data: { email: "anna@example.com" } });
    }
  });

  it("echoes the invited address back after a failed submit", () => {
    const result = parseSignupFormData(
      formData({ name: "Anna", email: "bertil@example.com", password: "kort", passwordConfirmation: "kort" }),
      { invitedEmail: "anna@example.com" },
    );

    expect(result).toMatchObject({ ok: false, values: { name: "Anna", email: "anna@example.com" } });
  });
});

describe("parseNewPasswordFormData", () => {
  it("returns the token and password for a valid payload", () => {
    const result = parseNewPasswordFormData(
      formData({ token: "abc", password: "ett långt lösenord", passwordConfirmation: "ett långt lösenord" }),
    );

    expect(result).toEqual({ ok: true, data: { token: "abc", password: "ett långt lösenord" } });
  });

  it.each([
    [
      "a short password",
      { token: "abc", password: "kort", passwordConfirmation: "kort" },
      "Lösenordet måste vara minst 12 tecken",
    ],
    [
      "mismatched passwords",
      { token: "abc", password: "ett långt lösenord", passwordConfirmation: "ett annat lösenord" },
      "Lösenorden matchar inte",
    ],
    [
      "a missing token",
      { password: "ett långt lösenord", passwordConfirmation: "ett långt lösenord" },
      "Ogiltiga formulärdata",
    ],
    ["a missing confirmation", { token: "abc", password: "ett långt lösenord" }, "Ogiltiga formulärdata"],
  ])("refuses %s", (_case, fields, error) => {
    expect(parseNewPasswordFormData(formData(fields))).toEqual({ ok: false, error });
  });
});

// Changing your own name on Mitt konto parses with the schema itself; signup maps its failure to the same words.
describe("userNameSchema", () => {
  it.each(["", "   "])("rejects %j with a Swedish message", (name) => {
    const result = userNameSchema.safeParse(name);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Namn krävs");
  });
});
