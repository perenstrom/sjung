import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const SESSION_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  sessionVersion: true,
} as const;

/**
 * The signed-in User, read fresh from the database on every call — never from
 * the JWT, which would go stale when the User verifies on another device.
 * Null without a session, when the session's User no longer exists, or when
 * the session was revoked (logged in before the User's `sessionVersion` was
 * bumped, e.g. by a Password reset). Does not check verification: use
 * `requireUser()` for anything behind the gate.
 */
export async function getSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SESSION_USER_SELECT });
  // Sessions from before sessionVersion existed carry none; they count as 0.
  if (!user || user.sessionVersion !== (session.user.sessionVersion ?? 0)) {
    return null;
  }
  return user;
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
