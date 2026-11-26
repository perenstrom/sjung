import { describe, expect, it } from "vitest";

import { createUser } from "../support/fixtures";
import { emailedLinkToken, failEmailsTo, sentEmails, type SentEmail } from "../support/fake-email";
import { testPrisma } from "../support/db";
import {
  confirmEmailVerification,
  getVerificationTokenState,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";
import { CONFIRM_EMAIL_PATH } from "@/lib/auth/routes";

const linkTokenIn = (email: SentEmail) => emailedLinkToken(email, CONFIRM_EMAIL_PATH);

/** Sends a verification email to a new Unverified user and returns the link's token. */
async function emailedToken(now?: Date) {
  const user = await createUser({ email: "anna@example.com", emailVerifiedAt: null });
  await sendVerificationEmail(user.id, now);
  return { user, token: linkTokenIn(sentEmails().at(-1)!) };
}

async function isVerified(userId: string) {
  const user = await testPrisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.emailVerifiedAt !== null;
}

describe("sendVerificationEmail", () => {
  it("emails the User a confirm link on APP_BASE_URL", async () => {
    const user = await createUser({ name: "Anna", email: "anna@example.com", emailVerifiedAt: null });

    await sendVerificationEmail(user.id);

    const [email] = sentEmails();
    expect(sentEmails()).toHaveLength(1);
    expect(email.to).toBe("anna@example.com");
    expect(email.subject).toBe("Bekräfta din e-postadress för Sjung");
    expect(email.text).toContain("Hej Anna");
    expect(email.text).toContain("24 timmar");
    expect(linkTokenIn(email)).not.toBe("");
  });

  it("throws when sending fails, so the page can offer to try again", async () => {
    const user = await createUser({ email: "anna@example.com", emailVerifiedAt: null });
    failEmailsTo("anna@example.com");

    await expect(sendVerificationEmail(user.id)).rejects.toThrow();
  });
});

describe("opening the confirm link", () => {
  it("shows a valid token's address and changes nothing (mail scanners open links)", async () => {
    const { user, token } = await emailedToken();

    await expect(getVerificationTokenState(token)).resolves.toEqual({
      state: "valid",
      email: "anna@example.com",
    });
    await expect(getVerificationTokenState(token)).resolves.toMatchObject({ state: "valid" });
    expect(await isVerified(user.id)).toBe(false);
  });
});

describe("confirmEmailVerification", () => {
  it("marks the User Verified and uses up the token", async () => {
    const { user, token } = await emailedToken();

    await expect(confirmEmailVerification(token)).resolves.toEqual({ ok: true });

    expect(await isVerified(user.id)).toBe(true);
    await expect(getVerificationTokenState(token)).resolves.toEqual({ state: "already-verified" });
    await expect(confirmEmailVerification(token)).resolves.toEqual({ ok: false });
  });

  it("keeps an already Verified user's original verification time", async () => {
    const sentAt = new Date("2026-11-01T12:00:00Z");
    const { user, token } = await emailedToken(sentAt);
    // Verified another way since, e.g. by a Password reset.
    const verifiedAt = new Date("2026-11-01T12:05:00Z");
    await testPrisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: verifiedAt } });

    await expect(confirmEmailVerification(token, new Date("2026-11-01T12:10:00Z"))).resolves.toEqual({
      ok: true,
    });

    const reloaded = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.emailVerifiedAt).toEqual(verifiedAt);
  });
});
