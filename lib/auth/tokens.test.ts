import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "@/lib/auth/tokens";

describe("hashToken", () => {
  it("is the hex SHA-256 of the token", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});

describe("generateToken", () => {
  it("returns a URL-safe token with 256 bits of randomness", () => {
    const token = generateToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(token);
  });
});
