import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/group-access", () => ({
  requireGroupAccess: vi.fn(),
  findGroupAccess: vi.fn(),
}));

import { requireGroupAccess, type GroupAccess } from "@/lib/group-access";
import { runContentMutation, runGroupMutation } from "@/lib/tenant-group";

const mockRequireGroupAccess = vi.mocked(requireGroupAccess);

const access = {
  userId: "user-1",
  group: { id: "group-1", slug: "kor", name: "Kören" },
  can: () => true,
  require: () => {},
} satisfies GroupAccess;

const expectedCtx = { userId: "user-1", groupId: "group-1", groupSlug: "kor", access };

describe("runGroupMutation", () => {
  it("resolves the group, then runs guard and mutation in order with a shared context", async () => {
    mockRequireGroupAccess.mockResolvedValue(access);

    const calls: string[] = [];
    const guard = vi.fn(async (ctx) => {
      calls.push("guard");
      expect(ctx).toEqual(expectedCtx);
      return { resourceId: "resource-1" };
    });
    const mutation = vi.fn(async (ctx, guarded) => {
      calls.push("mutation");
      expect(ctx).toEqual(expectedCtx);
      expect(guarded).toEqual({ resourceId: "resource-1" });
      return "mutation-result";
    });

    const result = await runGroupMutation("kor", guard, mutation);

    expect(result).toBe("mutation-result");
    expect(calls).toEqual(["guard", "mutation"]);
  });

  it("propagates a guard failure without invoking the mutation", async () => {
    mockRequireGroupAccess.mockResolvedValue(access);

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
    mockRequireGroupAccess.mockRejectedValue(new Error("Ogiltig grupp eller saknad behörighet"));

    const guard = vi.fn();
    const mutation = vi.fn();

    await expect(runGroupMutation("okand-grupp", guard, mutation)).rejects.toThrow(
      "Ogiltig grupp eller saknad behörighet"
    );
    expect(guard).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
  });
});

describe("runContentMutation", () => {
  it("requires manageContent, then runs the mutation with the Group's context", async () => {
    const calls: string[] = [];
    const contentAccess = {
      ...access,
      require: vi.fn((capability) => {
        calls.push(`require:${capability}`);
      }),
    } satisfies GroupAccess;
    mockRequireGroupAccess.mockResolvedValue(contentAccess);

    const result = await runContentMutation("kor", async (ctx) => {
      calls.push("mutation");
      expect(ctx).toEqual({ ...expectedCtx, access: contentAccess });
      return "mutation-result";
    });

    expect(result).toBe("mutation-result");
    expect(calls).toEqual(["require:manageContent", "mutation"]);
  });

  it("refuses without running the mutation when the Member may not manage content", async () => {
    mockRequireGroupAccess.mockResolvedValue({
      ...access,
      require: () => {
        throw new Error("Du har inte behörighet att ändra innehåll i gruppen");
      },
    });
    const mutation = vi.fn();

    await expect(runContentMutation("kor", mutation)).rejects.toThrow(
      "Du har inte behörighet att ändra innehåll i gruppen"
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("refuses without running the mutation when the User isn't a Member", async () => {
    mockRequireGroupAccess.mockRejectedValue(new Error("Ogiltig grupp eller saknad behörighet"));
    const mutation = vi.fn();

    await expect(runContentMutation("okand-grupp", mutation)).rejects.toThrow(
      "Ogiltig grupp eller saknad behörighet"
    );
    expect(mutation).not.toHaveBeenCalled();
  });
});
