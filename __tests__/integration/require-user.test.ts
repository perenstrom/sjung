import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { createUser } from "../support/fixtures";
import { testPrisma } from "../support/db";
import { getSessionUser, requireUser } from "@/lib/auth/require-user";

const mockAuth = vi.mocked(auth);

function actAs(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId } } as never);
}

describe("requireUser", () => {
  it("returns a Verified user", async () => {
    const user = await createUser({ name: "Anna", email: "anna@example.com" });
    actAs(user.id);

    await expect(requireUser()).resolves.toMatchObject({
      id: user.id,
      name: "Anna",
      email: "anna@example.com",
    });
  });

  it("rejects an Unverified user", async () => {
    const user = await createUser({ emailVerifiedAt: null });
    actAs(user.id);

    await expect(requireUser()).rejects.toThrow("E-postadressen är inte bekräftad");
  });

  it("reads the verified state from the database, not the session", async () => {
    const user = await createUser({ emailVerifiedAt: null });
    actAs(user.id);
    await expect(requireUser()).rejects.toThrow();

    await testPrisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });

    await expect(requireUser()).resolves.toMatchObject({ id: user.id });
  });

  it("rejects a request without a session", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(requireUser()).rejects.toThrow("Unauthorized");
  });

  it("rejects a session whose User no longer exists", async () => {
    actAs("00000000-0000-0000-0000-000000000000");

    await expect(requireUser()).rejects.toThrow("Unauthorized");
  });
});

describe("getSessionUser", () => {
  it("returns an Unverified user with their verified state", async () => {
    const user = await createUser({ emailVerifiedAt: null });
    actAs(user.id);

    await expect(getSessionUser()).resolves.toMatchObject({ id: user.id, emailVerifiedAt: null });
  });

  it("returns null without a session", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(getSessionUser()).resolves.toBeNull();
  });
});
