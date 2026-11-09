import { describe, expect, it } from "vitest";

import { createGroup, createUser } from "../support/fixtures";
import { testPrisma } from "../support/db";
import { UserTokenPurpose } from "@/app/generated/prisma/client";
import { type EmailLinks, invitationLinks, userLinks } from "@/lib/email-links/email-links";

const VALID_FOR_HOURS = 24;
const sentAt = new Date("2026-11-01T12:00:00Z");
const after = (seconds: number) => new Date(sentAt.getTime() + seconds * 1000);

async function newUserId() {
  return (await createUser()).id;
}

async function newInvitationId() {
  const group = await createGroup();
  const invitation = await testPrisma.invitation.create({
    data: { groupId: group.id, email: `invited-${group.slug}@example.com` },
  });
  return invitation.id;
}

// Every kind of Emailed link follows the same rules, whichever table holds its tokens.
describe.each<{ kind: string; links: EmailLinks; newSubject: () => Promise<string> }>([
  {
    kind: "email verification (UserToken)",
    links: userLinks(UserTokenPurpose.EMAIL_VERIFICATION, { validForHours: VALID_FOR_HOURS }),
    newSubject: newUserId,
  },
  {
    kind: "Invitation (InvitationToken)",
    links: invitationLinks({ validForHours: VALID_FOR_HOURS }),
    newSubject: newInvitationId,
  },
])("$kind links", ({ links, newSubject }) => {
  /** Issues a link at `now`, returning the delivered token (or the issue result if none went out). */
  async function issue(subjectId: string, now: Date) {
    let delivered: string | null = null;
    const result = await links.issue(
      subjectId,
      async (token) => {
        delivered = token;
      },
      now
    );
    return { result, token: delivered as string | null };
  }

  const failingDelivery = async () => {
    throw new Error("Kunde inte skicka");
  };

  describe("issue", () => {
    it("delivers a usable token for the subject", async () => {
      const subjectId = await newSubject();

      const { result, token } = await issue(subjectId, sentAt);

      expect(result).toEqual({ status: "sent" });
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      await expect(links.lookUp(token!, after(1))).resolves.toEqual({ status: "usable", subjectId });
    });

    it("makes earlier links invalid once a newer one is delivered", async () => {
      const subjectId = await newSubject();
      const { token: oldToken } = await issue(subjectId, sentAt);

      const { token: newToken } = await issue(subjectId, after(60));

      await expect(links.lookUp(oldToken!, after(61))).resolves.toEqual({ status: "invalid" });
      await expect(links.lookUp(newToken!, after(61))).resolves.toEqual({ status: "usable", subjectId });
    });

    it("refuses within 60 seconds of the latest link and says how long to wait", async () => {
      const subjectId = await newSubject();
      await issue(subjectId, sentAt);

      const { result, token } = await issue(subjectId, after(45));

      expect(result).toEqual({ status: "cooldown", retryAfterSeconds: 15 });
      expect(token).toBeNull();
    });

    it("keeps one subject's cooldown from holding back another's", async () => {
      await issue(await newSubject(), sentAt);

      const { result } = await issue(await newSubject(), after(1));

      expect(result).toEqual({ status: "sent" });
    });

    it("rethrows a failed delivery, keeps the earlier link working and allows an immediate retry", async () => {
      const subjectId = await newSubject();
      const { token: oldToken } = await issue(subjectId, sentAt);

      await expect(links.issue(subjectId, failingDelivery, after(60))).rejects.toThrow("Kunde inte skicka");

      await expect(links.lookUp(oldToken!, after(61))).resolves.toEqual({ status: "usable", subjectId });
      const { result } = await issue(subjectId, after(61));
      expect(result).toEqual({ status: "sent" });
    });

    it("lets a subject whose very first delivery failed retry at once", async () => {
      const subjectId = await newSubject();
      await expect(links.issue(subjectId, failingDelivery, sentAt)).rejects.toThrow();

      const { result } = await issue(subjectId, after(1));

      expect(result).toEqual({ status: "sent" });
    });
  });

  describe("lookUp", () => {
    it("treats an unknown token as invalid", async () => {
      await expect(links.lookUp("not-a-real-token")).resolves.toEqual({ status: "invalid" });
    });

    it("treats a token as invalid once its validity has passed", async () => {
      const subjectId = await newSubject();
      const { token } = await issue(subjectId, sentAt);

      const expiry = after(VALID_FOR_HOURS * 60 * 60);
      await expect(links.lookUp(token!, after(VALID_FOR_HOURS * 60 * 60 - 1))).resolves.toEqual({
        status: "usable",
        subjectId,
      });
      await expect(links.lookUp(token!, expiry)).resolves.toEqual({ status: "invalid" });
    });

    it("changes nothing, so the token stays redeemable", async () => {
      const subjectId = await newSubject();
      const { token } = await issue(subjectId, sentAt);

      await links.lookUp(token!, after(1));
      await links.lookUp(token!, after(2));

      await expect(testPrisma.$transaction((tx) => links.redeem(tx, token!, after(3)))).resolves.toBe(subjectId);
    });
  });

  describe("redeem", () => {
    it("uses up a usable token once, returning its subject", async () => {
      const subjectId = await newSubject();
      const { token } = await issue(subjectId, sentAt);

      await expect(testPrisma.$transaction((tx) => links.redeem(tx, token!, after(1)))).resolves.toBe(subjectId);

      await expect(links.lookUp(token!, after(2))).resolves.toEqual({ status: "used", subjectId });
      await expect(testPrisma.$transaction((tx) => links.redeem(tx, token!, after(2)))).resolves.toBeNull();
    });

    it("refuses an expired, superseded or unknown token", async () => {
      const subjectId = await newSubject();
      const { token: superseded } = await issue(subjectId, sentAt);
      const { token: latest } = await issue(subjectId, after(60));
      const redeemAt = (token: string, now: Date) => testPrisma.$transaction((tx) => links.redeem(tx, token, now));

      await expect(redeemAt(superseded!, after(61))).resolves.toBeNull();
      await expect(redeemAt(latest!, after(60 + VALID_FOR_HOURS * 60 * 60))).resolves.toBeNull();
      await expect(redeemAt("not-a-real-token", after(61))).resolves.toBeNull();
    });

    it("leaves the token unused when the caller's transaction rolls back", async () => {
      const subjectId = await newSubject();
      const { token } = await issue(subjectId, sentAt);

      await expect(
        testPrisma.$transaction(async (tx) => {
          await links.redeem(tx, token!, after(1));
          throw new Error("rollback");
        })
      ).rejects.toThrow("rollback");

      await expect(links.lookUp(token!, after(2))).resolves.toEqual({ status: "usable", subjectId });
    });
  });
});

describe("UserToken links of another purpose", () => {
  it("are neither looked up, redeemed nor invalidated by this purpose's links", async () => {
    const verification = userLinks(UserTokenPurpose.EMAIL_VERIFICATION, { validForHours: 24 });
    const reset = userLinks(UserTokenPurpose.PASSWORD_RESET, { validForHours: 1 });
    const userId = await newUserId();
    let verificationToken = "";
    await verification.issue(userId, async (token) => {
      verificationToken = token;
    }, sentAt);

    // A reset link for the same User, sent at once: no shared cooldown, no invalidation.
    await expect(reset.issue(userId, async () => {}, after(1))).resolves.toEqual({ status: "sent" });

    await expect(reset.lookUp(verificationToken, after(2))).resolves.toEqual({ status: "invalid" });
    await expect(testPrisma.$transaction((tx) => reset.redeem(tx, verificationToken, after(2)))).resolves.toBeNull();
    await expect(verification.lookUp(verificationToken, after(2))).resolves.toEqual({
      status: "usable",
      subjectId: userId,
    });
  });
});
