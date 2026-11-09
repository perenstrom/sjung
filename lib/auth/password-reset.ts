import argon2 from "argon2";
import { createElement } from "react";
import { UserTokenPurpose } from "@/app/generated/prisma/client";
import { appUrl } from "@/lib/app-base-url";
import { PASSWORD_RESET_EMAIL_SUBJECT, PasswordResetEmail } from "@/lib/auth/password-reset-email";
import { NEW_PASSWORD_PATH } from "@/lib/auth/routes";
import { sendEmail } from "@/lib/email";
import { userLinks } from "@/lib/email-links/email-links";
import { normalizeEmail } from "@/lib/normalize-email";
import prisma from "@/lib/prisma";

// Shorter than verification's 24 hours: a reset link hands over the account.
export const PASSWORD_RESET_VALID_FOR_HOURS = 1;
const resetLinks = userLinks(UserTokenPurpose.PASSWORD_RESET, { validForHours: PASSWORD_RESET_VALID_FOR_HOURS });

/**
 * "Glömt lösenord": emails a reset link to the User with this address, if
 * there is one. Resolves the same way whether or not an account exists, the
 * request falls within the cooldown, or sending fails — the caller must not be
 * able to tell, or the form would reveal who has an account.
 */
export async function requestPasswordReset(email: string, now: Date = new Date()): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return;
  }

  try {
    // A "cooldown" result is dropped on purpose, like everything else here.
    await resetLinks.issue(
      user.id,
      (token) =>
        sendEmail({
          to: user.email,
          subject: PASSWORD_RESET_EMAIL_SUBJECT,
          react: createElement(PasswordResetEmail, {
            name: user.name,
            resetUrl: appUrl(NEW_PASSWORD_PATH, { token }),
            validForHours: PASSWORD_RESET_VALID_FOR_HOURS,
          }),
        }),
      now
    );
  } catch (sendError) {
    console.error("Kunde inte skicka mejl för lösenordsåterställning", sendError);
  }
}

export type PasswordResetTokenState = { state: "valid"; email: string } | { state: "invalid" };

/**
 * What the new-password page shows for a token. Read-only on purpose: mail
 * scanners open the link before the human does.
 */
export async function getPasswordResetTokenState(
  token: string,
  now: Date = new Date()
): Promise<PasswordResetTokenState> {
  const lookup = await resetLinks.lookUp(token, now);
  if (lookup.status !== "usable") {
    return { state: "invalid" };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: lookup.subjectId },
    select: { email: true },
  });
  return { state: "valid", email: user.email };
}

/**
 * Uses up the token and, together with that, sets the new password, makes the
 * User Verified (the link proved they control the inbox) and logs out all of
 * their sessions. `newPassword` must already have passed the password rules.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
  now: Date = new Date()
): Promise<{ ok: boolean }> {
  // Hashed up front: argon2 is slow and shouldn't hold the transaction open.
  const passwordHash = await argon2.hash(newPassword);

  return prisma.$transaction(async (tx) => {
    const userId = await resetLinks.redeem(tx, token, now);
    if (!userId) {
      return { ok: false };
    }
    await tx.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    return { ok: true };
  });
}
