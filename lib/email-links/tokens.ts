import { createHash, randomBytes } from "node:crypto";

// The pure parts of an Emailed link's token. Everything that touches the
// database lives in ./email-links.ts.

/** A fresh raw token for an emailed link. Never stored; only its hash is. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The stored form of a token. A plain SHA-256 is enough because the token is
 * 256 random bits — there's nothing to brute-force, unlike a password.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const MS_PER_HOUR = 60 * 60 * 1000;

/** When a token issued at `now` and valid for `validForHours` stops working. */
export function tokenExpiresAt(now: Date, validForHours: number): Date {
  return new Date(now.getTime() + validForHours * MS_PER_HOUR);
}

/** The columns every emailed-link token table shares. */
export type TokenTimestamps = { usedAt: Date | null; invalidatedAt: Date | null; expiresAt: Date };

/**
 * What a stored token is at `now`: "used" once redeemed, "invalid" when
 * superseded or expired, otherwise "usable".
 */
export function tokenStatus(row: TokenTimestamps, now: Date): "usable" | "used" | "invalid" {
  if (row.usedAt) {
    return "used";
  }
  if (row.invalidatedAt || row.expiresAt <= now) {
    return "invalid";
  }
  return "usable";
}

/** A `where` filter matching only tokens `tokenStatus` calls "usable". */
export function usableTokenWhere(now: Date) {
  return { usedAt: null, invalidatedAt: null, expiresAt: { gt: now } };
}

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Seconds left before another link may be emailed, given when the latest one
 * was issued: a new link at most every 60 seconds. 0 when one may go out now.
 */
export function cooldownSecondsLeft(latestIssuedAt: Date | null, now: Date): number {
  if (!latestIssuedAt) {
    return 0;
  }
  const elapsedSeconds = (now.getTime() - latestIssuedAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds));
}
