import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));
// The action only needs next-auth's AuthError class; the real package pulls in
// Next's server runtime, which doesn't load under Vitest.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

import { signIn } from "@/auth";
import { testPrisma } from "../support/db";
import { failEmailsTo, sentEmails } from "../support/fake-email";
import { signUp } from "@/app/actions/auth";

const mockSignIn = vi.mocked(signIn);

beforeEach(() => {
  mockSignIn.mockClear();
});

function signupForm(email: string): FormData {
  const fd = new FormData();
  fd.set("name", "Anna");
  fd.set("email", email);
  fd.set("password", "ett långt lösenord");
  fd.set("passwordConfirmation", "ett långt lösenord");
  fd.set("next", "/app");
  return fd;
}

describe("signUp", () => {
  it("creates an Unverified user, emails a confirm link and holds them on the verify-email page", async () => {
    await signUp(null, signupForm("Anna@Example.com"));

    const user = await testPrisma.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(user.emailVerifiedAt).toBeNull();
    expect(sentEmails().map((email) => email.to)).toEqual(["anna@example.com"]);
    expect(sentEmails()[0].text).toContain("/auth/verify-email/confirm?token=");
    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "anna@example.com", redirectTo: "/auth/verify-email" })
    );
  });

  it("keeps the User and signs them in when the email can't be sent, flagging the failure", async () => {
    failEmailsTo("anna@example.com");

    await signUp(null, signupForm("anna@example.com"));

    await expect(
      testPrisma.user.findUnique({ where: { email: "anna@example.com" } })
    ).resolves.not.toBeNull();
    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/auth/verify-email?skickat=nej" })
    );
  });
});
