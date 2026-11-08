import argon2 from "argon2";
import { describe, expect, it } from "vitest";

import { createUser } from "../support/fixtures";
import { failEmailsTo, sentEmails } from "../support/fake-email";
import { testPrisma } from "../support/db";
import {
  completePasswordReset,
  getPasswordResetTokenState,
  requestPasswordReset,
} from "@/lib/auth/password-reset";

const RESET_LINK = /http:\/\/sjung\.test\/auth\/reset-password\/new\?token=([A-Za-z0-9_-]+)/;
const NEW_PASSWORD = "ett nytt långt lösenord";

function linkTokenIn(text: string): string {
  const match = text.match(RESET_LINK);
  if (!match) {
    throw new Error(`No reset link in email:\n${text}`);
  }
  return match[1];
}

const sentAt = new Date("2026-11-01T12:00:00Z");
const after = (seconds: number) => new Date(sentAt.getTime() + seconds * 1000);

/** Requests a reset for a new User and returns the emailed link's token. */
async function emailedToken(overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser({ email: "anna@example.com", ...overrides });
  await requestPasswordReset("anna@example.com", sentAt);
  return { user, token: linkTokenIn(sentEmails().at(-1)!.text) };
}

async function reloadUser(userId: string) {
  return testPrisma.user.findUniqueOrThrow({ where: { id: userId } });
}

describe("requestPasswordReset", () => {
  it("emails the User a reset link on APP_BASE_URL", async () => {
    await createUser({ name: "Anna", email: "anna@example.com" });

    await requestPasswordReset("anna@example.com");

    const [email] = sentEmails();
    expect(sentEmails()).toHaveLength(1);
    expect(email.to).toBe("anna@example.com");
    expect(email.subject).toBe("Återställ ditt lösenord för Sjung");
    expect(email.text).toContain("Hej Anna");
    expect(email.text).toContain("1 timme");
    expect(linkTokenIn(email.text)).not.toBe("");
  });

  it("matches the address regardless of case and surrounding spaces", async () => {
    await createUser({ email: "anna@example.com" });

    await requestPasswordReset("  Anna@Example.com ");

    expect(sentEmails().map((email) => email.to)).toEqual(["anna@example.com"]);
  });

  it("sends nothing, and doesn't fail, for an address without an account", async () => {
    await expect(requestPasswordReset("nobody@example.com")).resolves.toBeUndefined();

    expect(sentEmails()).toHaveLength(0);
  });

  it("silently skips a request within 60 seconds of the latest email", async () => {
    await emailedToken();

    await expect(requestPasswordReset("anna@example.com", after(45))).resolves.toBeUndefined();

    expect(sentEmails()).toHaveLength(1);
  });

  it("sends a new link after 60 seconds, replacing the old one", async () => {
    const { token: oldToken } = await emailedToken();

    await requestPasswordReset("anna@example.com", after(60));

    expect(sentEmails()).toHaveLength(2);
    const newToken = linkTokenIn(sentEmails()[1].text);
    await expect(getPasswordResetTokenState(oldToken, after(61))).resolves.toEqual({ state: "invalid" });
    await expect(getPasswordResetTokenState(newToken, after(61))).resolves.toMatchObject({ state: "valid" });
  });

  it("swallows a failed send, so the result never reveals whether the account exists", async () => {
    await createUser({ email: "anna@example.com" });
    failEmailsTo("anna@example.com");

    await expect(requestPasswordReset("anna@example.com")).resolves.toBeUndefined();

    expect(sentEmails()).toHaveLength(0);
  });
});

describe("opening the reset link", () => {
  it("shows a valid token's address and changes nothing (mail scanners open links)", async () => {
    const { user, token } = await emailedToken();

    await expect(getPasswordResetTokenState(token, after(1))).resolves.toEqual({
      state: "valid",
      email: "anna@example.com",
    });
    await expect(getPasswordResetTokenState(token, after(2))).resolves.toMatchObject({ state: "valid" });
    expect((await reloadUser(user.id)).passwordHash).toBe(user.passwordHash);
  });

  it("treats an unknown token as invalid", async () => {
    await expect(getPasswordResetTokenState("not-a-real-token")).resolves.toEqual({ state: "invalid" });
  });

  it("doesn't accept an email verification token", async () => {
    const { sendVerificationEmail } = await import("@/lib/auth/email-verification");
    const user = await createUser({ email: "anna@example.com", emailVerifiedAt: null });
    await sendVerificationEmail(user.id);
    const verificationToken = sentEmails()[0].text.match(/token=([A-Za-z0-9_-]+)/)![1];

    await expect(getPasswordResetTokenState(verificationToken)).resolves.toEqual({ state: "invalid" });
    await expect(completePasswordReset(verificationToken, NEW_PASSWORD)).resolves.toEqual({ ok: false });
  });
});

describe("completePasswordReset", () => {
  it("sets the new password and uses up the token", async () => {
    const { user, token } = await emailedToken();

    await expect(completePasswordReset(token, NEW_PASSWORD, after(60))).resolves.toEqual({ ok: true });

    const updated = await reloadUser(user.id);
    expect(await argon2.verify(updated.passwordHash, NEW_PASSWORD)).toBe(true);
    await expect(getPasswordResetTokenState(token, after(61))).resolves.toEqual({ state: "invalid" });
    await expect(completePasswordReset(token, "ännu ett lösenord här", after(62))).resolves.toEqual({
      ok: false,
    });
  });

  it("logs out all of the User's sessions", async () => {
    const { user, token } = await emailedToken();

    await completePasswordReset(token, NEW_PASSWORD, after(60));

    expect((await reloadUser(user.id)).sessionVersion).toBe(user.sessionVersion + 1);
  });

  it("makes an Unverified user Verified, since they proved control of the inbox", async () => {
    const { user, token } = await emailedToken({ emailVerifiedAt: null });

    await completePasswordReset(token, NEW_PASSWORD, after(60));

    expect((await reloadUser(user.id)).emailVerifiedAt).toEqual(after(60));
  });

  it("keeps an already Verified user's original verification time", async () => {
    const verifiedAt = new Date("2026-01-01T00:00:00Z");
    const { user, token } = await emailedToken({ emailVerifiedAt: verifiedAt });

    await completePasswordReset(token, NEW_PASSWORD, after(60));

    expect((await reloadUser(user.id)).emailVerifiedAt).toEqual(verifiedAt);
  });

  it("rejects a token after 1 hour and leaves the password alone", async () => {
    const { user, token } = await emailedToken();
    const later = after(60 * 60 + 1);

    await expect(getPasswordResetTokenState(token, later)).resolves.toEqual({ state: "invalid" });
    await expect(completePasswordReset(token, NEW_PASSWORD, later)).resolves.toEqual({ ok: false });
    expect((await reloadUser(user.id)).passwordHash).toBe(user.passwordHash);
  });

  it("rejects an unknown token", async () => {
    await expect(completePasswordReset("not-a-real-token", NEW_PASSWORD)).resolves.toEqual({ ok: false });
  });
});
