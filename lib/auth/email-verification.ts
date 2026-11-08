import { createElement } from "react";
import { UserTokenPurpose } from "@/app/generated/prisma/client";
import { appUrl } from "@/lib/app-base-url";
import {
  issueUserToken,
  latestUserTokenIssuedAt,
  lookUpUserToken,
  redeemUserToken,
} from "@/lib/auth/tokens";
import { VERIFICATION_EMAIL_SUBJECT, VerificationEmail } from "@/lib/auth/verification-email";
import { CONFIRM_EMAIL_PATH } from "@/lib/auth/verify-email-routes";
import { sendEmail } from "@/lib/email";
import prisma from "@/lib/prisma";

const PURPOSE = UserTokenPurpose.EMAIL_VERIFICATION;
const VALID_FOR_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Emails a fresh confirm link, replacing earlier ones. Throws if the email
 * can't be sent; the User's earlier link then keeps working.
 */
export async function sendVerificationEmail(userId: string, now: Date = new Date()): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });
  await issueUserToken(userId, PURPOSE, { validForHours: VALID_FOR_HOURS, now }, (token) =>
    sendEmail({
      to: user.email,
      subject: VERIFICATION_EMAIL_SUBJECT,
      react: createElement(VerificationEmail, {
        name: user.name,
        confirmUrl: appUrl(CONFIRM_EMAIL_PATH, { token }),
        validForHours: VALID_FOR_HOURS,
      }),
    })
  );
}

/**
 * "Skicka igen": sends a new link unless the latest one went out less than 60
 * seconds ago. Throws, like `sendVerificationEmail`, if sending fails.
 */
export async function resendVerificationEmail(
  userId: string,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const lastSentAt = await latestUserTokenIssuedAt(userId, PURPOSE);
  if (lastSentAt) {
    const elapsedSeconds = (now.getTime() - lastSentAt.getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      return { ok: false, retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds) };
    }
  }

  await sendVerificationEmail(userId, now);
  return { ok: true };
}

export type VerificationTokenState =
  | { state: "valid"; email: string }
  | { state: "already-verified" }
  | { state: "invalid" };

/**
 * What the confirm page shows for a token. Read-only on purpose: see the
 * confirm page for why opening the link must not verify anything.
 */
export async function getVerificationTokenState(
  token: string,
  now: Date = new Date()
): Promise<VerificationTokenState> {
  const lookup = await lookUpUserToken(token, PURPOSE, now);
  if (lookup.status === "invalid") {
    return { state: "invalid" };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: lookup.userId },
    select: { email: true, emailVerifiedAt: true },
  });
  if (lookup.status === "used") {
    return user.emailVerifiedAt ? { state: "already-verified" } : { state: "invalid" };
  }
  return { state: "valid", email: user.email };
}

/** Uses up the token and marks its User Verified, together. */
export async function confirmEmailVerification(
  token: string,
  now: Date = new Date()
): Promise<{ ok: boolean }> {
  return prisma.$transaction(async (tx) => {
    const userId = await redeemUserToken(tx, token, PURPOSE, now);
    if (!userId) {
      return { ok: false };
    }
    await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } });
    return { ok: true };
  });
}
