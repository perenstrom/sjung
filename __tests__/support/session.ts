import { vi } from "vitest";
import { auth } from "@/auth";

// Identity seam for integration tests (docs/testing-access-rights.md). The
// calling test file must `vi.mock("@/auth", …)` so `auth` is a mock here too.

/**
 * Runs the code under test as the signed-in User `userId`. `sessionVersion` is
 * what the session's JWT was stamped with at login; it defaults to a new
 * User's 0.
 */
export function actAs(userId: string, { sessionVersion = 0 }: { sessionVersion?: number } = {}) {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, sessionVersion } } as never);
}

/** Runs the code under test without a session. */
export function actAsAnonymous() {
  vi.mocked(auth).mockResolvedValue(null as never);
}
