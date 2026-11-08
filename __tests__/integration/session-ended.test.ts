import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { signOut } from "@/auth";
import { createUser } from "../support/fixtures";
import { testPrisma } from "../support/db";
import { actAs, actAsAnonymous } from "../support/session";
import { GET } from "@/app/auth/session-ended/route";

const mockSignOut = vi.mocked(signOut);

beforeEach(() => {
  mockSignOut.mockClear();
});

describe("GET /auth/session-ended", () => {
  it("clears a revoked session's cookie and sends the browser to the login page", async () => {
    const user = await createUser();
    actAs(user.id, { sessionVersion: 0 });
    await testPrisma.user.update({ where: { id: user.id }, data: { sessionVersion: 1 } });

    await GET();

    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/auth/login" });
  });

  it("clears the cookie when there's no usable session at all", async () => {
    actAsAnonymous();

    await GET();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("leaves a session that still counts alone", async () => {
    const user = await createUser();
    actAs(user.id);

    await expect(GET()).rejects.toThrow("redirect:/app");
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
