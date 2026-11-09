import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Makes the User a Verified user, inside the caller's transaction — for when
 * they have just proven they control their inbox by using an Emailed link.
 * Keeps the original time if they were already Verified.
 */
export async function markVerified(tx: Prisma.TransactionClient, userId: string, now: Date): Promise<void> {
  await tx.user.updateMany({
    where: { id: userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: now },
  });
}
