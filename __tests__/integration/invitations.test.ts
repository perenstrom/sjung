import { describe, expect, it } from "vitest";

import { createAccessScenario, createUser } from "../support/fixtures";
import { emailedLinkToken, failEmailsTo, resetFakeEmail, sentEmails, type SentEmail } from "../support/fake-email";
import { testPrisma } from "../support/db";
import { inviteToNewGroup } from "../support/invitations";
import {
  acceptInvitation,
  getInvitationSignup,
  getInvitationView,
  inviteToGroup,
  signUpFromInvitation,
} from "@/lib/invitations/invitations";
import { hashToken } from "@/lib/auth/tokens";
import { INVITATION_PATH } from "@/lib/invitations/routes";

const linkTokenIn = (email: SentEmail) => emailedLinkToken(email, INVITATION_PATH);

async function isMember(userId: string, groupId: string) {
  const row = await testPrisma.usersToGroups.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return row !== null;
}

const viewer = (user: { id: string; email: string }) => ({ id: user.id, email: user.email });

describe("inviteToGroup", () => {
  it("emails the address an accept link and adds no one yet", async () => {
    const { group, creator, nonMember } = await createAccessScenario();

    await expect(
      inviteToGroup({ groupId: group.id, email: nonMember.email, invitedById: creator.id })
    ).resolves.toEqual({ status: "sent" });

    expect(sentEmails()).toHaveLength(1);
    const [email] = sentEmails();
    expect(email.to).toBe(nonMember.email);
    expect(email.subject).toBe(`Du har bjudits in till ${group.name} på Sjung`);
    expect(email.text).toContain(group.name);
    expect(email.text).toContain(creator.name);
    expect(email.text).toContain("14 dagar");
    expect(linkTokenIn(email)).not.toBe("");
    expect(await isMember(nonMember.id, group.id)).toBe(false);
  });

  it("invites an address that has no account the same way", async () => {
    const { group, creator } = await createAccessScenario();

    await expect(
      inviteToGroup({ groupId: group.id, email: "ny@example.com", invitedById: creator.id })
    ).resolves.toEqual({ status: "sent" });

    expect(sentEmails().map((email) => email.to)).toEqual(["ny@example.com"]);
  });

  it("refuses an address that already belongs to a Member", async () => {
    const { group, creator, member } = await createAccessScenario();

    await expect(
      inviteToGroup({ groupId: group.id, email: member.email, invitedById: creator.id })
    ).resolves.toEqual({ status: "already-member" });
    expect(sentEmails()).toHaveLength(0);
  });

  it("matches a Member's address regardless of case", async () => {
    const { group, creator } = await createAccessScenario();
    const anna = await createUser({ email: "anna@example.com" });
    await testPrisma.usersToGroups.create({ data: { userId: anna.id, groupId: group.id } });

    await expect(
      inviteToGroup({ groupId: group.id, email: " Anna@Example.com ", invitedById: creator.id })
    ).resolves.toEqual({ status: "already-member" });
  });
});

describe("opening the accept link", () => {
  it("offers a visitor without a session to log in or, for an address with no account, sign up", async () => {
    const { group, token } = await inviteToNewGroup();

    await expect(getInvitationView(token, null)).resolves.toEqual({
      state: "sign-in",
      groupName: group.name,
      canSignUp: true,
    });
  });

  it("only asks to log in when the address already has an account, Verified or not", async () => {
    await createUser({ email: "anna@example.com" });
    await createUser({ email: "bertil@example.com", emailVerifiedAt: null });
    const { token: annasToken } = await inviteToNewGroup("Anna@Example.com");
    const { token: bertilsToken } = await inviteToNewGroup("bertil@example.com");

    await expect(getInvitationView(annasToken, null)).resolves.toMatchObject({ canSignUp: false });
    await expect(getInvitationView(bertilsToken, null)).resolves.toMatchObject({ canSignUp: false });
  });

  it("offers to join to the User the Invitation was sent to, changing nothing", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");

    await expect(getInvitationView(token, viewer(anna))).resolves.toEqual({
      state: "can-accept",
      groupName: group.name,
    });
    await expect(getInvitationView(token, viewer(anna))).resolves.toMatchObject({
      state: "can-accept",
    });
    expect(await isMember(anna.id, group.id)).toBe(false);
  });

  it("matches the signed-in User's address regardless of case", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { token } = await inviteToNewGroup("Anna@Example.com");

    await expect(getInvitationView(token, viewer(anna))).resolves.toMatchObject({
      state: "can-accept",
    });
  });

  it("tells a User signed in with another address that it was sent elsewhere", async () => {
    const bertil = await createUser({ email: "bertil@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");

    await expect(getInvitationView(token, viewer(bertil))).resolves.toEqual({
      state: "wrong-account",
      groupName: group.name,
    });
  });

  it("treats an unknown token as no longer valid", async () => {
    await expect(getInvitationView("not-a-real-token", null)).resolves.toEqual({ state: "invalid" });
  });

  it("treats a token as no longer valid after 14 days", async () => {
    const sentAt = new Date("2026-11-01T12:00:00Z");
    const { token } = await inviteToNewGroup("anna@example.com", sentAt);

    await expect(
      getInvitationView(token, null, new Date("2026-11-15T11:59:59Z"))
    ).resolves.toMatchObject({ state: "sign-in" });
    await expect(
      getInvitationView(token, null, new Date("2026-11-15T12:00:00Z"))
    ).resolves.toEqual({ state: "invalid" });
  });
});

describe("acceptInvitation", () => {
  async function verifiedAt(userId: string) {
    const user = await testPrisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.emailVerifiedAt;
  }

  it("makes the invited User a Member with no Claims and uses up the token", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");

    await expect(acceptInvitation(token, viewer(anna))).resolves.toEqual({
      ok: true,
      groupSlug: group.slug,
    });

    expect(await isMember(anna.id, group.id)).toBe(true);
    expect(
      await testPrisma.groupMemberClaim.count({ where: { userId: anna.id, groupId: group.id } })
    ).toBe(0);
    await expect(acceptInvitation(token, viewer(anna))).resolves.toEqual({ ok: false });
  });

  it("then shows the link as already accepted to the new Member, and as invalid to anyone else", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");
    await acceptInvitation(token, viewer(anna));

    await expect(getInvitationView(token, viewer(anna))).resolves.toEqual({
      state: "already-member",
      groupName: group.name,
      groupSlug: group.slug,
    });
    await expect(getInvitationView(token, null)).resolves.toEqual({ state: "invalid" });
  });

  it("makes an Unverified user Verified, since only their inbox got the link", async () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const anna = await createUser({ email: "anna@example.com", emailVerifiedAt: null });
    const { token } = await inviteToNewGroup("anna@example.com", now);

    await expect(acceptInvitation(token, viewer(anna), now)).resolves.toMatchObject({ ok: true });

    expect(await verifiedAt(anna.id)).toEqual(now);
  });

  it("keeps an already Verified user's verification time", async () => {
    const verified = new Date("2026-01-01T00:00:00Z");
    const anna = await createUser({ email: "anna@example.com", emailVerifiedAt: verified });
    const { token } = await inviteToNewGroup("anna@example.com");

    await acceptInvitation(token, viewer(anna));

    expect(await verifiedAt(anna.id)).toEqual(verified);
  });

  it("refuses a User signed in with another address and leaves the token usable", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const bertil = await createUser({ email: "bertil@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com");

    await expect(acceptInvitation(token, viewer(bertil))).resolves.toEqual({ ok: false });

    expect(await isMember(bertil.id, group.id)).toBe(false);
    await expect(acceptInvitation(token, viewer(anna))).resolves.toMatchObject({ ok: true });
  });

  it("refuses an expired token", async () => {
    const sentAt = new Date("2026-11-01T12:00:00Z");
    const anna = await createUser({ email: "anna@example.com" });
    const { group, token } = await inviteToNewGroup("anna@example.com", sentAt);

    await expect(
      acceptInvitation(token, viewer(anna), new Date("2026-11-15T12:00:00Z"))
    ).resolves.toEqual({ ok: false });
    expect(await isMember(anna.id, group.id)).toBe(false);
  });

  it("refuses an unknown token", async () => {
    const anna = await createUser({ email: "anna@example.com" });

    await expect(acceptInvitation("not-a-real-token", viewer(anna))).resolves.toEqual({ ok: false });
  });
});

describe("getInvitationSignup", () => {
  it("gives the invited address and Group for a usable token", async () => {
    const { group, token } = await inviteToNewGroup("Anna@Example.com");

    await expect(getInvitationSignup(token)).resolves.toEqual({
      ok: true,
      email: "anna@example.com",
      groupName: group.name,
    });
  });

  it("refuses an unknown, expired or used token", async () => {
    const sentAt = new Date("2026-11-01T12:00:00Z");
    const { token } = await inviteToNewGroup("anna@example.com", sentAt);
    const anna = await createUser({ email: "anna@example.com" });

    await expect(getInvitationSignup("not-a-real-token")).resolves.toEqual({ ok: false });
    await expect(getInvitationSignup(token, new Date("2026-11-15T12:00:00Z"))).resolves.toEqual({ ok: false });
    await acceptInvitation(token, viewer(anna), sentAt);
    await expect(getInvitationSignup(token, sentAt)).resolves.toEqual({ ok: false });
  });
});

describe("signUpFromInvitation", () => {
  const signup = { name: "Anna", passwordHash: "hashed" };

  it("creates a Verified User who is a Member with no Claims, and uses up the token", async () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const { group, token } = await inviteToNewGroup("Anna@Example.com", now);

    await expect(signUpFromInvitation(token, signup, now)).resolves.toEqual({
      status: "created",
      email: "anna@example.com",
      groupSlug: group.slug,
    });

    const anna = await testPrisma.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(anna).toMatchObject({ name: "Anna", passwordHash: "hashed", emailVerifiedAt: now });
    expect(await isMember(anna.id, group.id)).toBe(true);
    expect(await testPrisma.groupMemberClaim.count({ where: { userId: anna.id } })).toBe(0);
    expect(await testPrisma.invitationToken.count({ where: { usedAt: now } })).toBe(1);
  });

  it("uses the address for a name left blank", async () => {
    const { token } = await inviteToNewGroup("anna@example.com");

    await signUpFromInvitation(token, { name: "", passwordHash: "hashed" });

    const anna = await testPrisma.user.findUniqueOrThrow({ where: { email: "anna@example.com" } });
    expect(anna.name).toBe("anna@example.com");
  });

  it("sends no email", async () => {
    const { token } = await inviteToNewGroup("anna@example.com");
    const sentBefore = sentEmails().length;

    await signUpFromInvitation(token, signup);

    expect(sentEmails()).toHaveLength(sentBefore);
  });

  it("creates nothing when the token is expired, superseded, used or unknown", async () => {
    const sentAt = new Date("2026-11-01T12:00:00Z");
    const later = new Date(sentAt.getTime() + 61 * 1000);
    const { group, creator, token: superseded } = await inviteToNewGroup("anna@example.com", sentAt);
    await inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: creator.id }, later);
    const { token: used } = await inviteToNewGroup("anna@example.com", sentAt);
    await testPrisma.invitationToken.update({ where: { tokenHash: hashToken(used) }, data: { usedAt: sentAt } });
    const { token: expired } = await inviteToNewGroup("anna@example.com", sentAt);
    const fourteenDaysLater = new Date("2026-11-15T12:00:00Z");

    for (const [token, at] of [
      [superseded, later],
      [used, later],
      ["not-a-real-token", later],
      [expired, fourteenDaysLater],
    ] as const) {
      await expect(signUpFromInvitation(token, signup, at)).resolves.toEqual({ status: "invalid" });
    }

    expect(await testPrisma.user.count({ where: { email: "anna@example.com" } })).toBe(0);
  });

  it("creates nothing and leaves the token usable when the address got an account in the meantime", async () => {
    const { group, token } = await inviteToNewGroup("anna@example.com");
    const anna = await createUser({ email: "anna@example.com", emailVerifiedAt: null });

    await expect(signUpFromInvitation(token, signup)).resolves.toEqual({ status: "email-taken" });

    expect(await testPrisma.user.count({ where: { email: "anna@example.com" } })).toBe(1);
    expect(await isMember(anna.id, group.id)).toBe(false);
    await expect(acceptInvitation(token, viewer(anna))).resolves.toMatchObject({ ok: true });
  });
});

describe("inviting the same address again", () => {
  const sentAt = new Date("2026-11-01T12:00:00Z");
  const after = (seconds: number) => new Date(sentAt.getTime() + seconds * 1000);

  it("sends a new link that replaces the old one and restarts the 14 days", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group, creator, token: oldToken } = await inviteToNewGroup("anna@example.com", sentAt);
    const resentAt = after(60);

    await expect(
      inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: creator.id }, resentAt)
    ).resolves.toEqual({ status: "sent" });
    const newToken = linkTokenIn(sentEmails().at(-1)!);

    await expect(getInvitationView(oldToken, viewer(anna), after(61))).resolves.toEqual({
      state: "invalid",
    });
    await expect(acceptInvitation(oldToken, viewer(anna), after(61))).resolves.toEqual({ ok: false });
    // 14 days after the re-send, not the first send.
    const justBeforeExpiry = new Date(resentAt.getTime() + 14 * 24 * 60 * 60 * 1000 - 1000);
    await expect(acceptInvitation(newToken, viewer(anna), justBeforeExpiry)).resolves.toMatchObject({
      ok: true,
    });
    expect(await testPrisma.invitation.count()).toBe(1);
  });

  it("refuses within 60 seconds of the latest link and says how long to wait", async () => {
    const { group, creator } = await inviteToNewGroup("anna@example.com", sentAt);

    await expect(
      inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: creator.id }, after(45))
    ).resolves.toEqual({ status: "cooldown", retryAfterSeconds: 15 });
    expect(sentEmails()).toHaveLength(1);
  });

  it("keeps the Invitation and the earlier link when sending fails, and allows an immediate retry", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group, creator, token: oldToken } = await inviteToNewGroup("anna@example.com", sentAt);
    failEmailsTo("anna@example.com");
    const invite = (at: Date) =>
      inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: creator.id }, at);

    await expect(invite(after(60))).resolves.toEqual({ status: "send-failed" });
    await expect(invite(after(61))).resolves.toEqual({ status: "send-failed" });

    expect(await testPrisma.invitation.count()).toBe(1);
    await expect(getInvitationView(oldToken, viewer(anna), after(62))).resolves.toMatchObject({
      state: "can-accept",
    });
  });

  it("records who re-sent it only once the email has gone out", async () => {
    const { group, creator } = await inviteToNewGroup("anna@example.com", sentAt);
    const manager = await createUser();
    await testPrisma.usersToGroups.create({ data: { userId: manager.id, groupId: group.id } });
    const resend = (at: Date) =>
      inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: manager.id }, at);
    const sender = async () =>
      testPrisma.invitation.findFirstOrThrow({ select: { invitedById: true, invitedAt: true } });

    failEmailsTo("anna@example.com");
    await resend(after(60));
    expect(await sender()).toEqual({ invitedById: creator.id, invitedAt: sentAt });

    resetFakeEmail();
    await resend(after(61));
    expect(await sender()).toEqual({ invitedById: manager.id, invitedAt: after(61) });
  });

  it("keeps the Invitation when the very first email fails", async () => {
    const { group, creator } = await createAccessScenario();
    failEmailsTo("ny@example.com");

    await expect(
      inviteToGroup({ groupId: group.id, email: "ny@example.com", invitedById: creator.id })
    ).resolves.toEqual({ status: "send-failed" });

    expect(await testPrisma.invitation.count({ where: { groupId: group.id } })).toBe(1);
  });

  it("does not let one Group's cooldown hold back another Group's Invitation", async () => {
    await inviteToNewGroup("anna@example.com", sentAt);
    const { group, creator } = await createAccessScenario();

    await expect(
      inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: creator.id }, after(1))
    ).resolves.toEqual({ status: "sent" });
  });
});

describe("what an Invitation outlives", () => {
  it("stays valid after its sender's account is deleted", async () => {
    const anna = await createUser({ email: "anna@example.com" });
    const { group } = await createAccessScenario();
    const sender = await createUser();
    await testPrisma.usersToGroups.create({ data: { userId: sender.id, groupId: group.id } });
    await inviteToGroup({ groupId: group.id, email: "anna@example.com", invitedById: sender.id });
    const token = linkTokenIn(sentEmails().at(-1)!);

    await testPrisma.user.delete({ where: { id: sender.id } });

    await expect(acceptInvitation(token, viewer(anna))).resolves.toMatchObject({ ok: true });
  });

  it("is deleted along with its Group", async () => {
    const { group } = await inviteToNewGroup("anna@example.com");

    await testPrisma.group.delete({ where: { id: group.id } });

    expect(await testPrisma.invitation.count()).toBe(0);
    expect(await testPrisma.invitationToken.count()).toBe(0);
  });
});
