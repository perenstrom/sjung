import { notFound } from "next/navigation";
import { isOperator } from "@/lib/operators/operators";
import { requireUser, type SessionUser } from "@/lib/auth/require-user";

/**
 * The signed-in Operator; throws for anyone else. Every Operator-only action
 * goes through this: hiding the UI is not enough.
 */
export async function requireOperator(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isOperator(user)) {
    throw new Error("Forbidden");
  }
  return user;
}

/** {@link requireOperator} for pages: anyone but an Operator gets not found. */
export async function requireOperatorPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isOperator(user)) {
    notFound();
  }
  return user;
}
