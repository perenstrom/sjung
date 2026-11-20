import { normalizeEmail } from "@/lib/normalize-email";

/**
 * The Operators' normalised email addresses, from the comma-separated
 * OPERATORS_EMAIL setting (ADR-0008). Missing or empty means nobody.
 */
function operatorEmails(): Set<string> {
  const list = process.env.OPERATORS_EMAIL ?? "";
  return new Set(list.split(",").map(normalizeEmail).filter(Boolean));
}

/** Whether the User is an Operator: their email address is in OPERATORS_EMAIL. */
export function isOperator(user: { email: string }): boolean {
  return operatorEmails().has(normalizeEmail(user.email));
}
