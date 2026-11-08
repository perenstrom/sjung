import argon2 from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));
// The action only needs next-auth's AuthError class; the real package pulls in
// Next's server runtime, which doesn't load under Vitest.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
// `after()` needs a live request; collect the callbacks and run them on demand.
const afterCallbacks = vi.hoisted(() => [] as Array<() => Promise<unknown>>);
vi.mock("next/server", () => ({
  after: (callback: () => Promise<unknown>) => {
    afterCallbacks.push(callback);
  },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { signOut } from "@/auth";
import { createUser } from "../support/fixtures";
import { sentEmails } from "../support/fake-email";
import { testPrisma } from "../support/db";
import { requestPasswordResetForm, setNewPassword } from "@/app/actions/auth";

const mockSignOut = vi.mocked(signOut);

beforeEach(() => {
  mockSignOut.mockClear();
  afterCallbacks.length = 0;
});

/** Runs the work the action scheduled to happen after its response. */
async function runAfterResponse() {
  await Promise.all(afterCallbacks.splice(0).map((callback) => callback()));
}

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

async function emailedToken() {
  const user = await createUser({ email: "anna@example.com" });
  await requestPasswordResetForm(null, form({ email: "anna@example.com" }));
  await runAfterResponse();
  const token = sentEmails().at(-1)!.text.match(/token=([A-Za-z0-9_-]+)/)![1];
  return { user, token };
}

describe("requestPasswordResetForm", () => {
  it("gives the same answer whether or not the address has an account", async () => {
    await createUser({ email: "anna@example.com" });

    const known = await requestPasswordResetForm(null, form({ email: "anna@example.com" }));
    const unknown = await requestPasswordResetForm(null, form({ email: "nobody@example.com" }));

    expect(known).toEqual({ status: "sent", email: "anna@example.com" });
    expect(unknown).toEqual({ status: "sent", email: "nobody@example.com" });
    await runAfterResponse();
    expect(sentEmails().map((email) => email.to)).toEqual(["anna@example.com"]);
  });

  it("answers before looking up the account, so response time doesn't reveal it either", async () => {
    await createUser({ email: "anna@example.com" });

    await requestPasswordResetForm(null, form({ email: "anna@example.com" }));

    expect(sentEmails()).toHaveLength(0);
    await runAfterResponse();
    expect(sentEmails()).toHaveLength(1);
  });

  it("rejects something that isn't an email address, keeping what was typed", async () => {
    await expect(requestPasswordResetForm(null, form({ email: " inte en adress " }))).resolves.toEqual({
      status: "error",
      error: "Ange en giltig e-postadress",
      values: { email: "inte en adress" },
    });
    expect(afterCallbacks).toHaveLength(0);
  });
});

describe("setNewPassword", () => {
  it("sets the password, then logs this browser out and sends it to the login page", async () => {
    const { user, token } = await emailedToken();

    await setNewPassword(
      null,
      form({ token, password: "ett nytt långt lösenord", passwordConfirmation: "ett nytt långt lösenord" })
    );

    const updated = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await argon2.verify(updated.passwordHash, "ett nytt långt lösenord")).toBe(true);
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/auth/login?aterstallt=1" });
  });

  it("returns the password rule that failed, without using up the token", async () => {
    const { token } = await emailedToken();

    await expect(
      setNewPassword(null, form({ token, password: "kort", passwordConfirmation: "kort" }))
    ).resolves.toEqual({ error: "Lösenordet måste vara minst 12 tecken" });
    expect(mockSignOut).not.toHaveBeenCalled();

    await setNewPassword(
      null,
      form({ token, password: "ett nytt långt lösenord", passwordConfirmation: "ett nytt långt lösenord" })
    );
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("sends an unusable token back to the link page, which explains it", async () => {
    await expect(
      setNewPassword(
        null,
        form({
          token: "not-a-real-token",
          password: "ett nytt långt lösenord",
          passwordConfirmation: "ett nytt långt lösenord",
        })
      )
    ).rejects.toThrow("redirect:/auth/reset-password/new?token=not-a-real-token");
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
