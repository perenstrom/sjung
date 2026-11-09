import type { Prisma, UserTokenPurpose } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  cooldownSecondsLeft,
  generateToken,
  hashToken,
  tokenExpiresAt,
  tokenStatus,
  usableTokenWhere,
  type TokenTimestamps,
} from "./tokens";

export type IssueLinkResult = { status: "sent" } | { status: "cooldown"; retryAfterSeconds: number };

export type EmailLinkLookup = { status: "usable" | "used"; subjectId: string } | { status: "invalid" };

/**
 * One kind of Emailed link (see CONTEXT.md). Its subject is what the link is
 * for: a User for password reset and email verification, an Invitation for
 * an Invitation. Opening a link may only `lookUp`; `redeem` belongs on the
 * POST that the link's page submits (ADR-0003).
 */
export type EmailLinks = {
  /**
   * Issues a new link for `subjectId` and hands its raw token to `deliver`
   * (which emails it). Refuses with "cooldown" within 60 seconds of the
   * subject's latest link. Once delivered, the subject's earlier links stop
   * working. If `deliver` throws, the undelivered link is removed — the
   * earlier link keeps working and a retry may go out at once — and the
   * error is rethrown.
   */
  issue(subjectId: string, deliver: (token: string) => Promise<void>, now?: Date): Promise<IssueLinkResult>;
  /** What a raw token is, changing nothing. Unknown, expired and superseded are all "invalid". */
  lookUp(token: string, now?: Date): Promise<EmailLinkLookup>;
  /**
   * Uses up a usable token inside the caller's transaction, so the token and
   * whatever it unlocks change together. Returns its subject's id, or null if
   * it wasn't usable (including when a concurrent redeem won the race).
   */
  redeem(tx: Prisma.TransactionClient, token: string, now?: Date): Promise<string | null>;
};

type Db = typeof prisma | Prisma.TransactionClient;

/** Where one kind of link's tokens are stored, phrased in terms of its subject. */
type TokenTable = {
  latestCreatedAt(subjectId: string): Promise<Date | null>;
  create(data: { subjectId: string; tokenHash: string; createdAt: Date; expiresAt: Date }): Promise<string>;
  delete(id: string): Promise<void>;
  /** Marks the subject's other unused, not yet invalidated tokens invalidated. */
  invalidateOthers(subjectId: string, keepId: string, now: Date): Promise<void>;
  findByHash(db: Db, tokenHash: string): Promise<(TokenTimestamps & { subjectId: string }) | null>;
  /** Marks the token used if it is usable; false if it wasn't. */
  markUsed(tx: Prisma.TransactionClient, tokenHash: string, now: Date): Promise<boolean>;
};

function emailLinks(table: TokenTable, { validForHours }: { validForHours: number }): EmailLinks {
  return {
    async issue(subjectId, deliver, now = new Date()) {
      const retryAfterSeconds = cooldownSecondsLeft(await table.latestCreatedAt(subjectId), now);
      if (retryAfterSeconds > 0) {
        return { status: "cooldown", retryAfterSeconds };
      }

      const token = generateToken();
      const issuedId = await table.create({
        subjectId,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: tokenExpiresAt(now, validForHours),
      });

      try {
        await deliver(token);
      } catch (deliveryError) {
        await table.delete(issuedId);
        throw deliveryError;
      }

      await table.invalidateOthers(subjectId, issuedId, now);
      return { status: "sent" };
    },

    async lookUp(token, now = new Date()) {
      const row = await table.findByHash(prisma, hashToken(token));
      if (!row) {
        return { status: "invalid" };
      }
      const status = tokenStatus(row, now);
      return status === "invalid" ? { status } : { status, subjectId: row.subjectId };
    },

    async redeem(tx, token, now = new Date()) {
      const tokenHash = hashToken(token);
      if (!(await table.markUsed(tx, tokenHash, now))) {
        return null;
      }
      return (await table.findByHash(tx, tokenHash))!.subjectId;
    },
  };
}

const unusedFilter = { usedAt: null, invalidatedAt: null };

/** Links whose subject is a User, kept apart per `purpose` (UserToken). */
export function userLinks(purpose: UserTokenPurpose, options: { validForHours: number }): EmailLinks {
  return emailLinks(
    {
      async latestCreatedAt(userId) {
        const latest = await prisma.userToken.findFirst({
          where: { userId, purpose },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        return latest?.createdAt ?? null;
      },
      async create({ subjectId, ...data }) {
        const row = await prisma.userToken.create({
          data: { ...data, userId: subjectId, purpose },
          select: { id: true },
        });
        return row.id;
      },
      async delete(id) {
        await prisma.userToken.delete({ where: { id } });
      },
      async invalidateOthers(userId, keepId, now) {
        await prisma.userToken.updateMany({
          where: { userId, purpose, ...unusedFilter, id: { not: keepId } },
          data: { invalidatedAt: now },
        });
      },
      async findByHash(db, tokenHash) {
        const row = await db.userToken.findUnique({ where: { tokenHash } });
        return row && row.purpose === purpose ? { ...row, subjectId: row.userId } : null;
      },
      async markUsed(tx, tokenHash, now) {
        const { count } = await tx.userToken.updateMany({
          where: { tokenHash, purpose, ...usableTokenWhere(now) },
          data: { usedAt: now },
        });
        return count > 0;
      },
    },
    options
  );
}

/** Links whose subject is an Invitation (InvitationToken). */
export function invitationLinks(options: { validForHours: number }): EmailLinks {
  return emailLinks(
    {
      async latestCreatedAt(invitationId) {
        const latest = await prisma.invitationToken.findFirst({
          where: { invitationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        return latest?.createdAt ?? null;
      },
      async create({ subjectId, ...data }) {
        const row = await prisma.invitationToken.create({
          data: { ...data, invitationId: subjectId },
          select: { id: true },
        });
        return row.id;
      },
      async delete(id) {
        await prisma.invitationToken.delete({ where: { id } });
      },
      async invalidateOthers(invitationId, keepId, now) {
        await prisma.invitationToken.updateMany({
          where: { invitationId, ...unusedFilter, id: { not: keepId } },
          data: { invalidatedAt: now },
        });
      },
      async findByHash(db, tokenHash) {
        const row = await db.invitationToken.findUnique({ where: { tokenHash } });
        return row && { ...row, subjectId: row.invitationId };
      },
      async markUsed(tx, tokenHash, now) {
        const { count } = await tx.invitationToken.updateMany({
          where: { tokenHash, ...usableTokenWhere(now) },
          data: { usedAt: now },
        });
        return count > 0;
      },
    },
    options
  );
}
