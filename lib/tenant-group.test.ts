import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    group: {
      findFirst: vi.fn(),
    },
  },
}));

import { requireUser } from "@/lib/auth/require-user";
import prisma from "@/lib/prisma";
import { runGroupMutation } from "@/lib/tenant-group";

const mockRequireUser = vi.mocked(requireUser);
const mockFindFirst = vi.mocked(prisma.group.findFirst);

describe("runGroupMutation", () => {
  it("resolves the group, then runs guard and mutation in order with a shared context", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-1" } as never);
    mockFindFirst.mockResolvedValue({ id: "group-1" } as never);

    const calls: string[] = [];
    const guard = vi.fn(async (ctx) => {
      calls.push("guard");
      expect(ctx).toEqual({ userId: "user-1", groupId: "group-1", groupSlug: "kor" });
      return { resourceId: "resource-1" };
    });
    const mutation = vi.fn(async (ctx, guarded) => {
      calls.push("mutation");
      expect(ctx).toEqual({ userId: "user-1", groupId: "group-1", groupSlug: "kor" });
      expect(guarded).toEqual({ resourceId: "resource-1" });
      return "mutation-result";
    });

    const result = await runGroupMutation("kor", guard, mutation);

    expect(result).toBe("mutation-result");
    expect(calls).toEqual(["guard", "mutation"]);
  });

  it("propagates a guard failure without invoking the mutation", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-1" } as never);
    mockFindFirst.mockResolvedValue({ id: "group-1" } as never);

    const guard = vi.fn(async () => {
      throw new Error("Stycke hittades inte");
    });
    const mutation = vi.fn();

    await expect(runGroupMutation("kor", guard, mutation)).rejects.toThrow(
      "Stycke hittades inte"
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("rejects before the guard runs when the slug does not resolve to a writable group", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-1" } as never);
    mockFindFirst.mockResolvedValue(null);

    const guard = vi.fn();
    const mutation = vi.fn();

    await expect(runGroupMutation("okand-grupp", guard, mutation)).rejects.toThrow(
      "Ogiltig grupp eller saknad behörighet"
    );
    expect(guard).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
  });
});
