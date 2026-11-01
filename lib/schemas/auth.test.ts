import { describe, expect, it } from "vitest";

import {
  loginCredentialsSchema,
  parseLoginFormData,
  parseRedirectPathFromFormData,
  parseRedirectPathFromValue,
  parseSignupFormData,
  signupCredentialsSchema,
} from "@/lib/schemas/auth";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseRedirectPathFromValue", () => {
  it("defaults to /app when missing or not an internal path", () => {
    expect(parseRedirectPathFromValue(undefined)).toBe("/app");
    expect(parseRedirectPathFromValue(null)).toBe("/app");
    expect(parseRedirectPathFromValue("")).toBe("/app");
    expect(parseRedirectPathFromValue("https://evil.com")).toBe("/app");
    expect(parseRedirectPathFromValue("relative")).toBe("/app");
  });

  it("accepts strings that start with /", () => {
    expect(parseRedirectPathFromValue("/app")).toBe("/app");
    expect(parseRedirectPathFromValue("/people")).toBe("/people");
  });
});

describe("parseRedirectPathFromFormData", () => {
  it("reads next from FormData with same rules as parseRedirectPathFromValue", () => {
    expect(parseRedirectPathFromFormData(createFormData({}))).toBe("/app");
    expect(
      parseRedirectPathFromFormData(createFormData({ next: "/noter" }))
    ).toBe("/noter");
    expect(
      parseRedirectPathFromFormData(createFormData({ next: "bad" }))
    ).toBe("/app");
  });
});

describe("loginCredentialsSchema", () => {
  it("trims email and accepts valid email", () => {
    expect(
      loginCredentialsSchema.parse({
        email: "  User@Example.com  ",
        password: "secret",
      })
    ).toEqual({
      email: "User@Example.com",
      password: "secret",
    });
  });

  it("rejects empty password", () => {
    const result = loginCredentialsSchema.safeParse({
      email: "a@b.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("does not trim password (leading space preserved)", () => {
    const result = loginCredentialsSchema.safeParse({
      email: "a@b.com",
      password: " x",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe(" x");
    }
  });

  it("rejects invalid email after trim", () => {
    const result = loginCredentialsSchema.safeParse({
      email: "not-an-email",
      password: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseLoginFormData", () => {
  it("returns parsed credentials and redirectTo", () => {
    const fd = createFormData({
      email: "  hi@example.com ",
      password: "pw",
      next: "/people",
    });
    const result = parseLoginFormData(fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("hi@example.com");
      expect(result.data.password).toBe("pw");
      expect(result.data.redirectTo).toBe("/people");
    }
  });

  it("fails when email or password is not a string field", () => {
    const fd = new FormData();
    fd.set("email", "a@b.com");
    expect(parseLoginFormData(fd).ok).toBe(false);
  });

  it("fails validation like the login action (invalid credentials message path)", () => {
    const fd = createFormData({
      email: "oops",
      password: "x",
      next: "/app",
    });
    expect(parseLoginFormData(fd).ok).toBe(false);
  });

  it("carries the trimmed email back on failure, but not the password", () => {
    const fd = createFormData({ email: " oops ", password: "x" });
    const result = parseLoginFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.values).toEqual({ email: "oops" });
    }
  });

  it("falls back to an empty email when the field is missing", () => {
    const fd = createFormData({ password: "x" });
    const result = parseLoginFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.values).toEqual({ email: "" });
    }
  });
});

describe("signupCredentialsSchema", () => {
  it("trims name and email; enforces password length without trim", () => {
    expect(
      signupCredentialsSchema.parse({
        name: "  Ada  ",
        email: " Ada@Example.com ",
        password: "123456789012",
        passwordConfirmation: "123456789012",
      })
    ).toEqual({
      name: "Ada",
      email: "Ada@Example.com",
      password: "123456789012",
    });
  });

  it("allows empty name after trim", () => {
    const result = signupCredentialsSchema.safeParse({
      name: "   ",
      email: "a@b.com",
      password: "1234567890123456",
      passwordConfirmation: "1234567890123456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });

  it("rejects short password without trimming for length", () => {
    const result = signupCredentialsSchema.safeParse({
      name: "x",
      email: "a@b.com",
      password: "12345678901",
      passwordConfirmation: "12345678901",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password confirmation that does not match", () => {
    const result = signupCredentialsSchema.safeParse({
      name: "x",
      email: "a@b.com",
      password: "123456789012",
      passwordConfirmation: "123456789013",
    });
    expect(result.success).toBe(false);
  });

  it("compares passwords exactly, without trimming", () => {
    const result = signupCredentialsSchema.safeParse({
      name: "x",
      email: "a@b.com",
      password: "123456789012",
      passwordConfirmation: "123456789012 ",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseSignupFormData", () => {
  it("maps short password to Swedish min-length message", () => {
    const fd = createFormData({
      name: "Test",
      email: "t@t.com",
      password: "short",
      passwordConfirmation: "short",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Lösenordet måste vara minst 12 tecken");
    }
  });

  it("maps mismatched passwords to Swedish mismatch message", () => {
    const fd = createFormData({
      name: "Test",
      email: "t@t.com",
      password: "123456789012",
      passwordConfirmation: "210987654321",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Lösenorden matchar inte");
      expect(result.values).toEqual({ name: "Test", email: "t@t.com" });
    }
  });

  it("reports the min-length message when the password is short and mismatched", () => {
    const fd = createFormData({
      name: "Test",
      email: "t@t.com",
      password: "short",
      passwordConfirmation: "other",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Lösenordet måste vara minst 12 tecken");
    }
  });

  it("fails when the password confirmation field is missing", () => {
    const fd = createFormData({
      name: "Test",
      email: "t@t.com",
      password: "123456789012",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Ogiltiga formulärdata");
    }
  });

  it("maps invalid email to Ogiltiga formulärdata", () => {
    const fd = createFormData({
      name: "Test",
      email: "not-email",
      password: "123456789012",
      passwordConfirmation: "123456789012",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Ogiltiga formulärdata");
    }
  });

  it("carries trimmed name and email back on failure, but not the password", () => {
    const fd = createFormData({
      name: " Ada ",
      email: " ada@example.com ",
      password: "short",
      passwordConfirmation: "short",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.values).toEqual({ name: "Ada", email: "ada@example.com" });
    }
  });

  it("falls back to empty values when fields are missing", () => {
    const fd = createFormData({ email: "ada@example.com" });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Ogiltiga formulärdata");
      expect(result.values).toEqual({ name: "", email: "ada@example.com" });
    }
  });

  it("returns ok with redirectTo for valid payload", () => {
    const fd = createFormData({
      name: "",
      email: "u@u.com",
      password: "123456789012",
      passwordConfirmation: "123456789012",
      next: "/app",
    });
    const result = parseSignupFormData(fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.redirectTo).toBe("/app");
      expect(result.data.email).toBe("u@u.com");
    }
  });
});
