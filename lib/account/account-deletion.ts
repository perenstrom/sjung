import argon2 from "argon2";
import { createElement } from "react";
import type { Prisma } from "@/app/generated/prisma/client";
import { ACCOUNT_DELETED_EMAIL_SUBJECT, AccountDeletedEmail } from "@/lib/account/account-deleted-email";
import { sendEmail } from "@/lib/email";
import { deleteGroupFiles } from "@/lib/pieces/file-store";
import prisma from "@/lib/prisma";

/**
 * Account deletion (CONTEXT.md, ADR-0006). The User's content stays with its
 * Group: the database clears every audit column that points at them. Groups
 * where they are Creator and the only Member go with them; Creator of a Group
 * with other Members blocks it, since Creator can't be handed over.
 */

export type CreatorGroup = { id: string; name: string; slug: string };

export type CreatorGroups = {
  /** Creator and the only Member: deleted along with the account. */
  soloGroups: CreatorGroup[];
  /** Creator with other Members: blocks Account deletion. */
  sharedGroups: CreatorGroup[];
};

type Db = Prisma.TransactionClient | typeof prisma;

/** The Groups the User is Creator of, by name, split by what Account deletion does with them. */
export async function findCreatorGroups(userId: string, db: Db = prisma): Promise<CreatorGroups> {
  const groups = await db.group.findMany({
    where: { createdById: userId },
    select: { id: true, name: true, slug: true, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  const soloGroups: CreatorGroup[] = [];
  const sharedGroups: CreatorGroup[] = [];
  for (const { _count, ...group } of groups) {
    (_count.users > 1 ? sharedGroups : soloGroups).push(group);
  }
  return { soloGroups, sharedGroups };
}

export type DeleteAccountResult =
  | { status: "deleted" }
  | { status: "wrong-password" }
  | { status: "blocked"; sharedGroups: CreatorGroup[] };

/**
 * Deletes the User if `password` is theirs and no Group blocks it, along with
 * their solo Groups, in one transaction. Then, as best effort, removes those
 * Groups' stored Files and emails a receipt to the former address.
 */
export async function deleteAccount(userId: string, password: string): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, passwordHash: true },
  });
  if (!(await argon2.verify(user.passwordHash, password))) {
    return { status: "wrong-password" };
  }

  const outcome = await prisma.$transaction(async (tx) => {
    // Locking the User's Creator Groups makes a concurrent join wait (adding a
    // Member key-share locks its Group), so the check below sees every Member
    // who joined before the deletion commits.
    await tx.$queryRaw`SELECT id FROM groups WHERE created_by_id = ${userId} FOR UPDATE`;
    const { soloGroups, sharedGroups } = await findCreatorGroups(userId, tx);
    if (sharedGroups.length > 0) {
      return { status: "blocked" as const, sharedGroups };
    }

    await tx.group.deleteMany({ where: { id: { in: soloGroups.map(({ id }) => id) } } });
    await tx.user.delete({ where: { id: userId } });
    return { status: "deleted" as const, soloGroups };
  });
  if (outcome.status === "blocked") {
    return outcome;
  }

  for (const group of outcome.soloGroups) {
    await deleteGroupFiles(group.id);
  }
  try {
    await sendEmail({
      to: user.email,
      subject: ACCOUNT_DELETED_EMAIL_SUBJECT,
      react: createElement(AccountDeletedEmail, { name: user.name }),
    });
  } catch (sendError) {
    console.error("Kunde inte skicka kvitto på borttaget konto", sendError);
  }
  return { status: "deleted" };
}
