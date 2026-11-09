import { createHash, randomBytes } from "node:crypto";
import type { Prisma, UserTokenPurpose } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

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
type TokenTimestamps = { usedAt: Date | null; invalidatedAt: Date | null; expiresAt: Date };

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

/**
 * Issues a new token for `purpose` and hands the raw value to `deliver` (which
 * emails the link). Only once delivery succeeds are the User's earlier unused
 * tokens for that purpose invalidated, so only the latest emailed link works.
 * If `deliver` throws, the undelivered token is removed — it never reached
 * anyone, the link the User already has keeps working, and it doesn't count
 * towards a resend cooldown — and the error is rethrown.
 */
export async function issueUserToken(
  userId: string,
  purpose: UserTokenPurpose,
  { validForHours, now = new Date() }: { validForHours: number; now?: Date },
  deliver: (token: string) => Promise<void>
): Promise<void> {
  const token = generateToken();
  const issued = await prisma.userToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      createdAt: now,
      expiresAt: tokenExpiresAt(now, validForHours),
    },
    select: { id: true },
  });

  try {
    await deliver(token);
  } catch (deliveryError) {
    await prisma.userToken.delete({ where: { id: issued.id } });
    throw deliveryError;
  }

  await prisma.userToken.updateMany({
    where: { userId, purpose, usedAt: null, invalidatedAt: null, id: { not: issued.id } },
    data: { invalidatedAt: now },
  });
}

export type UserTokenLookup =
  | { status: "usable"; userId: string }
  | { status: "used"; userId: string }
  | { status: "invalid" };

/**
 * Reads what a raw token is, without changing anything. "invalid" covers
 * unknown, expired and superseded tokens alike.
 */
export async function lookUpUserToken(
  token: string,
  purpose: UserTokenPurpose,
  now: Date = new Date()
): Promise<UserTokenLookup> {
  const row = await prisma.userToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.purpose !== purpose) {
    return { status: "invalid" };
  }
  const status = tokenStatus(row, now);
  return status === "invalid" ? { status } : { status, userId: row.userId };
}

/**
 * Marks a usable token used, inside the caller's transaction so the token and
 * whatever it unlocks change together. Returns its User's id, or null if the
 * token wasn't usable (including when a concurrent redeem won the race).
 */
export async function redeemUserToken(
  tx: Prisma.TransactionClient,
  token: string,
  purpose: UserTokenPurpose,
  now: Date = new Date()
): Promise<string | null> {
  const tokenHash = hashToken(token);
  const { count } = await tx.userToken.updateMany({
    where: { tokenHash, purpose, ...usableTokenWhere(now) },
    data: { usedAt: now },
  });
  if (count === 0) {
    return null;
  }
  const row = await tx.userToken.findUniqueOrThrow({
    where: { tokenHash },
    select: { userId: true },
  });
  return row.userId;
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

/** `cooldownSecondsLeft` for the User's latest `purpose` token. */
export async function resendCooldownSeconds(
  userId: string,
  purpose: UserTokenPurpose,
  now: Date = new Date()
): Promise<number> {
  const latest = await prisma.userToken.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return cooldownSecondsLeft(latest?.createdAt ?? null, now);
}
