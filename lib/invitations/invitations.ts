import { createElement } from "react";
import { appUrl } from "@/lib/app-base-url";
import {
  cooldownSecondsLeft,
  generateToken,
  hashToken,
  tokenExpiresAt,
  tokenStatus,
  usableTokenWhere,
} from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email";
import { InvitationEmail, invitationEmailSubject } from "@/lib/invitations/invitation-email";
import { INVITATION_PATH } from "@/lib/invitations/routes";
import { normalizeEmail } from "@/lib/normalize-email";
import prisma from "@/lib/prisma";

export const INVITATION_VALID_FOR_DAYS = 14;

export type InviteToGroupResult =
  | { status: "sent" }
  | { status: "already-member" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "send-failed" };

/**
 * Invites `email` to the Group: creates its Invitation, or re-sends the
 * pending one, and emails an accept link. A re-send issues a new link that
 * replaces the earlier ones and restarts the 14 days, at most once every 60
 * seconds. If sending fails the Invitation is kept, the earlier link keeps
 * working and a retry may go out at once. Gives the same answer whether or
 * not the address has an account. The caller must already have checked that
 * `invitedById` may manage the Group's members.
 */
export async function inviteToGroup(
  { groupId, email: rawEmail, invitedById }: { groupId: string; email: string; invitedById: string },
  now: Date = new Date()
): Promise<InviteToGroupResult> {
  const email = normalizeEmail(rawEmail);

  const existingMember = await prisma.usersToGroups.findFirst({
    where: { groupId, user: { email } },
    select: { userId: true },
  });
  if (existingMember) {
    return { status: "already-member" };
  }

  const latestToken = await prisma.invitationToken.findFirst({
    where: { invitation: { groupId, email } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const retryAfterSeconds = cooldownSecondsLeft(latestToken?.createdAt ?? null, now);
  if (retryAfterSeconds > 0) {
    return { status: "cooldown", retryAfterSeconds };
  }

  const invitation = await prisma.invitation.upsert({
    where: { groupId_email: { groupId, email } },
    create: { groupId, email, invitedById, invitedAt: now, createdAt: now },
    // A re-send's sender is recorded below, once its email has gone out.
    update: {},
    select: { id: true, group: { select: { name: true } } },
  });

  const inviterName = (
    await prisma.user.findUnique({ where: { id: invitedById }, select: { name: true } })
  )?.name ?? null;

  const token = generateToken();
  const issued = await prisma.invitationToken.create({
    data: {
      invitationId: invitation.id,
      tokenHash: hashToken(token),
      createdAt: now,
      expiresAt: tokenExpiresAt(now, INVITATION_VALID_FOR_DAYS * 24),
    },
    select: { id: true },
  });

  try {
    await sendEmail({
      to: email,
      subject: invitationEmailSubject(invitation.group.name),
      react: createElement(InvitationEmail, {
        groupName: invitation.group.name,
        inviterName,
        acceptUrl: appUrl(INVITATION_PATH, { token }),
        validForDays: INVITATION_VALID_FOR_DAYS,
      }),
    });
  } catch (sendError) {
    // Same as lib/auth/tokens.ts: the undelivered link never reached anyone,
    // so drop it — the earlier link keeps working and a retry isn't held back.
    console.error("Kunde inte skicka inbjudan", sendError);
    await prisma.invitationToken.delete({ where: { id: issued.id } });
    return { status: "send-failed" };
  }

  // Only the newest emailed link works.
  await prisma.$transaction([
    prisma.invitationToken.updateMany({
      where: { invitationId: invitation.id, usedAt: null, invalidatedAt: null, id: { not: issued.id } },
      data: { invalidatedAt: now },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { invitedById, invitedAt: now },
    }),
  ]);
  return { status: "sent" };
}

type InvitationTokenLookup =
  | {
      status: "usable" | "used";
      invitation: { email: string; group: { id: string; name: string; slug: string } };
    }
  | { status: "invalid" };

/** What a raw accept token is, without changing anything. */
async function lookUpInvitationToken(token: string, now: Date): Promise<InvitationTokenLookup> {
  const row = await prisma.invitationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      usedAt: true,
      invalidatedAt: true,
      expiresAt: true,
      invitation: { select: { email: true, group: { select: { id: true, name: true, slug: true } } } },
    },
  });
  if (!row) {
    return { status: "invalid" };
  }
  const status = tokenStatus(row, now);
  return status === "invalid" ? { status } : { status, invitation: row.invitation };
}

export type InvitationViewer = { id: string; email: string };

export type InvitationView =
  | { state: "can-accept"; groupName: string }
  | { state: "sign-in"; groupName: string }
  | { state: "wrong-account"; groupName: string }
  | { state: "already-member"; groupName: string; groupSlug: string }
  | { state: "invalid" };

/**
 * What the accept page shows for a token and whoever is viewing it. Read-only
 * on purpose: see the accept page for why opening the link must not join.
 */
export async function getInvitationView(
  token: string,
  viewer: InvitationViewer | null,
  now: Date = new Date()
): Promise<InvitationView> {
  const lookup = await lookUpInvitationToken(token, now);
  if (lookup.status === "invalid") {
    return { state: "invalid" };
  }
  const { group } = lookup.invitation;
  const groupName = group.name;

  if (lookup.status === "used") {
    const isMember =
      viewer !== null &&
      (await prisma.usersToGroups.findUnique({
        where: { userId_groupId: { userId: viewer.id, groupId: group.id } },
        select: { userId: true },
      })) !== null;
    return isMember ? { state: "already-member", groupName, groupSlug: group.slug } : { state: "invalid" };
  }

  if (!viewer) {
    return { state: "sign-in", groupName };
  }
  if (normalizeEmail(viewer.email) !== lookup.invitation.email) {
    return { state: "wrong-account", groupName };
  }
  return { state: "can-accept", groupName };
}

/**
 * The accept button's work: uses up the token and, together with that, makes
 * `viewer` a Member (with no Claims) and Verified — the link only reached the
 * invited inbox, so accepting proves the address (ADR-0003). Refuses unless
 * the token is usable and was sent to `viewer`'s address.
 */
export async function acceptInvitation(
  token: string,
  viewer: InvitationViewer,
  now: Date = new Date()
): Promise<{ ok: true; groupSlug: string } | { ok: false }> {
  const lookup = await lookUpInvitationToken(token, now);
  if (lookup.status !== "usable" || normalizeEmail(viewer.email) !== lookup.invitation.email) {
    return { ok: false };
  }

  return prisma.$transaction(async (tx) => {
    // Conditional, so a concurrent accept or a re-send in between wins cleanly.
    const { count } = await tx.invitationToken.updateMany({
      where: { tokenHash: hashToken(token), ...usableTokenWhere(now) },
      data: { usedAt: now },
    });
    if (count === 0) {
      return { ok: false as const };
    }

    await tx.usersToGroups.createMany({
      data: [{ userId: viewer.id, groupId: lookup.invitation.group.id }],
      skipDuplicates: true,
    });
    await tx.user.updateMany({
      where: { id: viewer.id, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    return { ok: true as const, groupSlug: lookup.invitation.group.slug };
  });
}
