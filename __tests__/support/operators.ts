import type { User } from "@/app/generated/prisma/client";
import { createUser } from "./fixtures";

/** The Operator's address. Each test file puts it in OPERATORS_EMAIL with `vi.stubEnv`. */
export const OPERATOR_EMAIL = "operator@sjung.test";

/** A User whose email is OPERATOR_EMAIL, so an Operator while OPERATORS_EMAIL lists it. */
export function createOperator(): Promise<User> {
  return createUser({ email: OPERATOR_EMAIL });
}
