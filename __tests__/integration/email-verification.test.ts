import { describe, expect, it } from "vitest";

import { createUser } from "../support/fixtures";
import { emailedLinkToken, failEmailsTo, sentEmails, type SentEmail } from "../support/fake-email";
import { testPrisma } from "../support/db";
import {
  confirmEmailVerification,
  getVerificationTokenState,
  resendVerificationEmail,
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

  it("treats an unknown token as invalid", async () => {
    await expect(getVerificationTokenState("not-a-real-token")).resolves.toEqual({
      state: "invalid",
    });
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

  it("rejects a token after 24 hours", async () => {
    const sentAt = new Date("2026-11-01T12:00:00Z");
    const { user, token } = await emailedToken(sentAt);
    const later = new Date("2026-11-02T12:00:01Z");

    await expect(getVerificationTokenState(token, later)).resolves.toEqual({ state: "invalid" });
    await expect(confirmEmailVerification(token, later)).resolves.toEqual({ ok: false });
    expect(await isVerified(user.id)).toBe(false);
  });

  it("rejects a token superseded by a newer email", async () => {
    const { user, token: oldToken } = await emailedToken();
    await sendVerificationEmail(user.id);
    const newToken = linkTokenIn(sentEmails().at(-1)!);

    await expect(getVerificationTokenState(oldToken)).resolves.toEqual({ state: "invalid" });
    await expect(confirmEmailVerification(oldToken)).resolves.toEqual({ ok: false });
    await expect(confirmEmailVerification(newToken)).resolves.toMatchObject({ ok: true });
  });

  it("rejects an unknown token", async () => {
    await expect(confirmEmailVerification("not-a-real-token")).resolves.toEqual({ ok: false });
  });
});

describe("resendVerificationEmail", () => {
  const sentAt = new Date("2026-11-01T12:00:00Z");
  const after = (seconds: number) => new Date(sentAt.getTime() + seconds * 1000);

  it("refuses within 60 seconds of the latest email and says how long to wait", async () => {
    const { user } = await emailedToken(sentAt);

    await expect(resendVerificationEmail(user.id, after(45))).resolves.toEqual({
      ok: false,
      retryAfterSeconds: 15,
    });
    expect(sentEmails()).toHaveLength(1);
  });

  it("sends a new link after 60 seconds, replacing the old one", async () => {
    const { user, token: oldToken } = await emailedToken(sentAt);

    await expect(resendVerificationEmail(user.id, after(60))).resolves.toEqual({ ok: true });

    expect(sentEmails()).toHaveLength(2);
    const newToken = linkTokenIn(sentEmails()[1]);
    await expect(getVerificationTokenState(oldToken, after(61))).resolves.toEqual({ state: "invalid" });
    await expect(getVerificationTokenState(newToken, after(61))).resolves.toMatchObject({ state: "valid" });
  });

  it("keeps the earlier link working and allows an immediate retry when sending fails", async () => {
    const { user, token: oldToken } = await emailedToken(sentAt);
    failEmailsTo("anna@example.com");

    await expect(resendVerificationEmail(user.id, after(60))).rejects.toThrow();

    await expect(getVerificationTokenState(oldToken, after(61))).resolves.toMatchObject({
      state: "valid",
    });
    await expect(resendVerificationEmail(user.id, after(62))).rejects.toThrow();
    expect(sentEmails()).toHaveLength(1);
  });

  it("lets a User whose first email failed retry at once", async () => {
    const user = await createUser({ email: "anna@example.com", emailVerifiedAt: null });
    failEmailsTo("anna@example.com");
    await expect(sendVerificationEmail(user.id, sentAt)).rejects.toThrow();

    // Throws again (still failing) rather than refusing with a cooldown.
    await expect(resendVerificationEmail(user.id, after(1))).rejects.toThrow();
  });

  it("sends when no email has been sent yet", async () => {
    const user = await createUser({ emailVerifiedAt: null });

    await expect(resendVerificationEmail(user.id)).resolves.toEqual({ ok: true });
    expect(sentEmails()).toHaveLength(1);
  });
});
