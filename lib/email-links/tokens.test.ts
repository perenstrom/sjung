import { describe, expect, it } from "vitest";
import { cooldownSecondsLeft, generateToken, hashToken, tokenStatus } from "@/lib/email-links/tokens";

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

describe("tokenStatus", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const later = new Date("2026-11-02T12:00:00Z");
  const earlier = new Date("2026-10-31T12:00:00Z");

  it("is usable before expiry when neither used nor invalidated", () => {
    expect(tokenStatus({ usedAt: null, invalidatedAt: null, expiresAt: later }, now)).toBe("usable");
  });

  it("is invalid once expired or superseded", () => {
    expect(tokenStatus({ usedAt: null, invalidatedAt: null, expiresAt: now }, now)).toBe("invalid");
    expect(tokenStatus({ usedAt: null, invalidatedAt: earlier, expiresAt: later }, now)).toBe("invalid");
  });

  it("is used once redeemed, even after expiry", () => {
    expect(tokenStatus({ usedAt: earlier, invalidatedAt: null, expiresAt: earlier }, now)).toBe("used");
  });
});

describe("cooldownSecondsLeft", () => {
  const issuedAt = new Date("2026-11-01T12:00:00Z");
  const after = (seconds: number) => new Date(issuedAt.getTime() + seconds * 1000);

  it("is 0 when no link has been issued", () => {
    expect(cooldownSecondsLeft(null, issuedAt)).toBe(0);
  });

  it("counts down the 60 seconds after the latest link, rounding up", () => {
    expect(cooldownSecondsLeft(issuedAt, after(0))).toBe(60);
    expect(cooldownSecondsLeft(issuedAt, after(44.5))).toBe(16);
    expect(cooldownSecondsLeft(issuedAt, after(60))).toBe(0);
  });
});
