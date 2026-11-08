import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const SESSION_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
} as const;

/**
 * The signed-in User, read fresh from the database on every call — never from
 * the JWT, which would go stale when the User verifies on another device.
 * Null without a session or when the session's User no longer exists. Does
 * not check verification: use `requireUser()` for anything behind the gate.
 */
export async function getSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({ where: { id: userId }, select: SESSION_USER_SELECT });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

/** The signed-in Verified user; throws for anyone else, Unverified users included. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!user.emailVerifiedAt) {
    throw new Error("E-postadressen är inte bekräftad");
  }

  return user;
}
