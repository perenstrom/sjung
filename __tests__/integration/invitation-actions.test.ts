import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
// Stands in for the request's cookie jar, where the Default group is kept.
const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

import { signOut } from "@/auth";
import { testPrisma } from "../support/db";
import { emailedLinkToken, sentEmails } from "../support/fake-email";
import { createAccessScenario, createUser } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs, actAsAnonymous } from "../support/session";
import { acceptGroupInvitation, logOutFromInvitation } from "@/app/actions/invitations";
import { ACTIVE_GROUP_COOKIE_NAME } from "@/lib/active-group-cookie";
import { inviteToGroup } from "@/lib/invitations/invitations";
import { INVITATION_PATH } from "@/lib/invitations/routes";

beforeEach(() => {
  cookieJar.clear();
  vi.mocked(signOut).mockClear();
});

async function inviteToNewGroup(email: string) {
  const { group, creator } = await createAccessScenario();
  await inviteToGroup({ groupId: group.id, email, invitedById: creator.id });
  return { group, token: emailedLinkToken(sentEmails().at(-1)!, INVITATION_PATH) };
}

async function isMember(userId: string, groupId: string) {
  const row = await testPrisma.usersToGroups.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return row !== null;
}

describe("acceptGroupInvitation", () => {
  it("joins the Group, makes it the Default group and goes there", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");
    actAs(anna.id);

    await expect(acceptGroupInvitation(formData({ token }))).rejects.toThrow(
      `redirect:/app/${group.slug}`
    );

    expect(await isMember(anna.id, group.id)).toBe(true);
    expect(cookieJar.get(ACTIVE_GROUP_COOKIE_NAME)).toBe(group.slug);
  });

  it("works for an Unverified user, who ends up Verified", async () => {
    const anna = await createUser({ email: "anna@example.com", emailVerifiedAt: null });
    const { group, token } = await inviteToNewGroup("anna@example.com");
    actAs(anna.id);

    await expect(acceptGroupInvitation(formData({ token }))).rejects.toThrow(
      `redirect:/app/${group.slug}`
    );

    const updated = await testPrisma.user.findUniqueOrThrow({ where: { id: anna.id } });
    expect(updated.emailVerifiedAt).not.toBeNull();
  });

  it("sends a User with another address back to the link page without joining", async () => {
    const bertil = await createUser({ email: "bertil@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");
    actAs(bertil.id);

    await expect(acceptGroupInvitation(formData({ token }))).rejects.toThrow(
      `redirect:/invitation?token=${token}`
    );

    expect(await isMember(bertil.id, group.id)).toBe(false);
    expect(cookieJar.has(ACTIVE_GROUP_COOKIE_NAME)).toBe(false);
  });

  it("sends a visitor without a session to log in, then back to the link page", async () => {
    const { token } = await inviteToNewGroup("anna@example.com");
    actAsAnonymous();

    await expect(acceptGroupInvitation(formData({ token }))).rejects.toThrow(
      `redirect:/auth/login?next=${encodeURIComponent(`/invitation?token=${token}`)}`
    );
  });
});

describe("logOutFromInvitation", () => {
  it("logs out and returns to the same link page", async () => {
    await logOutFromInvitation(formData({ token: "abc" }));

    expect(vi.mocked(signOut)).toHaveBeenCalledWith({ redirectTo: "/invitation?token=abc" });
  });
});
