import { createElement } from "react";
import { UserTokenPurpose } from "@/app/generated/prisma/client";
import { appUrl } from "@/lib/app-base-url";
import { VERIFICATION_EMAIL_SUBJECT, VerificationEmail } from "@/lib/auth/verification-email";
import { CONFIRM_EMAIL_PATH } from "@/lib/auth/routes";
import { sendEmail } from "@/lib/email";
import { type IssueLinkResult, userLinks } from "@/lib/email-links/email-links";
import prisma from "@/lib/prisma";

const VALID_FOR_HOURS = 24;
const verificationLinks = userLinks(UserTokenPurpose.EMAIL_VERIFICATION, { validForHours: VALID_FOR_HOURS });

/**
 * Emails a fresh confirm link, replacing earlier ones — unless the latest one
 * went out less than 60 seconds ago ("cooldown"). Throws if the email can't be
 * sent; the User's earlier link then keeps working.
 */
export async function sendVerificationEmail(userId: string, now: Date = new Date()): Promise<IssueLinkResult> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return verificationLinks.issue(
    userId,
    (token) =>
      sendEmail({
        to: user.email,
        subject: VERIFICATION_EMAIL_SUBJECT,
        react: createElement(VerificationEmail, {
          name: user.name,
          confirmUrl: appUrl(CONFIRM_EMAIL_PATH, { token }),
          validForHours: VALID_FOR_HOURS,
        }),
      }),
    now
  );
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
  const lookup = await verificationLinks.lookUp(token, now);
  if (lookup.status === "invalid") {
    return { state: "invalid" };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: lookup.subjectId },
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
    const userId = await verificationLinks.redeem(tx, token, now);
    if (!userId) {
      return { ok: false };
    }
    await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } });
    return { ok: true };
  });
}
