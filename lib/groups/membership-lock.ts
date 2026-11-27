import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Locks one Member's membership row for the rest of the transaction, throwing
 * when they aren't a Member. Saves that replace a Member's whole Claim or Role
 * set take it first, so concurrent saves queue and the last one replaces the
 * set instead of merging with it.
 */
export async function lockMembership(tx: Prisma.TransactionClient, userId: string, groupId: string): Promise<void> {
  const membership = await tx.$queryRaw<unknown[]>`
    SELECT 1 FROM users_to_groups
    WHERE user_id = ${userId} AND group_id = ${groupId}
    FOR UPDATE
  `;
  if (membership.length === 0) {
    throw new Error("Medlemmen finns inte i gruppen");
  }
}
