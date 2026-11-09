import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));
// The action only needs next-auth's AuthError class; the real package pulls in
// Next's server runtime, which doesn't load under Vitest.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
vi.mock("next/headers", () => import("../support/cookie-jar"));

import argon2 from "argon2";
import { signIn } from "@/auth";
import { cookieJar } from "../support/cookie-jar";
import { testPrisma } from "../support/db";
import { sentEmails } from "../support/fake-email";
import { createUser } from "../support/fixtures";
import { formData } from "../support/form-data";
import { inviteToNewGroup } from "../support/invitations";
import { signUpFromInvitationForm } from "@/app/actions/auth";
import { ACTIVE_GROUP_COOKIE_NAME } from "@/lib/active-group-cookie";
import { inviteToGroup } from "@/lib/invitations/invitations";

const mockSignIn = vi.mocked(signIn);

beforeEach(() => {
  cookieJar.clear();
  mockSignIn.mockClear();
});

const password = "ett långt lösenord";

function signupForm(invitation: string, overrides: Record<string, string> = {}) {
  return formData({
    invitation,
    name: "Anna",
    email: "anna@example.com",
    password,
    passwordConfirmation: password,
    ...overrides,
  });
}

describe("signUpFromInvitationForm", () => {
  it("creates the invited, Verified Member, signs them in and opens the Group as their Default group", async () => {
    const { group, token } = await inviteToNewGroup("anna@example.com");
    const sentBefore = sentEmails().length;

    await signUpFromInvitationForm(null, signupForm(token));

    const anna = await testPrisma.user.findUniqueOrThrow({
      where: { email: "anna@example.com" },
      include: { groups: true },
    });
    expect(anna.emailVerifiedAt).not.toBeNull();
    expect(await argon2.verify(anna.passwordHash, password)).toBe(true);
    expect(anna.groups.map((membership) => membership.groupId)).toEqual([group.id]);
    expect(cookieJar.get(ACTIVE_GROUP_COOKIE_NAME)).toBe(group.slug);
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "anna@example.com",
      password,
      redirectTo: `/app/${group.slug}`,
    });
    expect(sentEmails()).toHaveLength(sentBefore);
  });

  it("gives the account the invited address whatever email was submitted", async () => {
    const { token } = await inviteToNewGroup("anna@example.com");

    await signUpFromInvitationForm(null, signupForm(token, { email: "bertil@example.com" }));

    expect(await testPrisma.user.count({ where: { email: "anna@example.com" } })).toBe(1);
    expect(await testPrisma.user.count({ where: { email: "bertil@example.com" } })).toBe(0);
  });

  it("validates the passwords like normal signup", async () => {
    const { token } = await inviteToNewGroup("anna@example.com");

    await expect(
      signUpFromInvitationForm(null, signupForm(token, { passwordConfirmation: "något helt annat" }))
    ).resolves.toEqual({
      error: "Lösenorden matchar inte",
      values: { name: "Anna", email: "anna@example.com" },
    });
    expect(await testPrisma.user.count({ where: { email: "anna@example.com" } })).toBe(0);
  });

  it("sends a no-longer-valid token back to the signup page, which explains it, creating nothing", async () => {
    const { group, creator, token } = await inviteToNewGroup("anna@example.com");
    // Superseded by a re-send a minute later.
    await inviteToGroup(
      { groupId: group.id, email: "anna@example.com", invitedById: creator.id },
      new Date(Date.now() + 61_000)
    );

    await expect(signUpFromInvitationForm(null, signupForm(token))).rejects.toThrow(
      `redirect:/auth/signup?invitation=${token}`
    );
    expect(await testPrisma.user.count({ where: { email: "anna@example.com" } })).toBe(0);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("says an account already exists when one appeared since the page loaded", async () => {
    const { token } = await inviteToNewGroup("anna@example.com");
    await createUser({ email: "anna@example.com" });

    await expect(signUpFromInvitationForm(null, signupForm(token))).resolves.toEqual({
      error: "Det finns redan ett konto med den e-postadressen",
      values: { name: "Anna", email: "anna@example.com" },
    });
    expect(await testPrisma.user.count({ where: { email: "anna@example.com" } })).toBe(1);
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
