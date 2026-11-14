import { describe, expect, it, vi } from "vitest";

import { deleteKeysWithConcurrency } from "@/lib/object-storage";

function deleteFailingOn(failingKeys: Iterable<string> = []) {
  const failing = new Set(failingKeys);
  return async (key: string) => {
    if (failing.has(key)) {
      throw new Error(`boom: ${key}`);
    }
  };
}

/** A delete that records how many calls were running at once. */
function trackingDelete() {
  const tracker = { active: 0, maxActive: 0 };
  const deleteOne = async () => {
    tracker.active += 1;
    tracker.maxActive = Math.max(tracker.maxActive, tracker.active);
    await new Promise((resolve) => setTimeout(resolve, 0));
    tracker.active -= 1;
  };
  return { tracker, deleteOne };
}

describe("deleteKeysWithConcurrency", () => {
  it("returns an empty result without deleting anything for no keys", async () => {
    const deleteOne = vi.fn();
    const result = await deleteKeysWithConcurrency([], deleteOne);

    expect(result).toEqual({ totalCount: 0, failedCount: 0, failedKeys: [] });
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it("reports zero failures when every delete succeeds", async () => {
    const result = await deleteKeysWithConcurrency(["a", "b", "c"], deleteFailingOn());

    expect(result).toEqual({ totalCount: 3, failedCount: 0, failedKeys: [] });
  });

  it("collects failed keys instead of throwing", async () => {
    const result = await deleteKeysWithConcurrency(["a", "b", "c"], deleteFailingOn(["b"]));

    expect(result).toEqual({ totalCount: 3, failedCount: 1, failedKeys: ["b"] });
  });

  it("attempts every key even after some fail", async () => {
    const attempted: string[] = [];
    const result = await deleteKeysWithConcurrency(["a", "b", "c", "d"], async (key) => {
      attempted.push(key);
      if (key === "a" || key === "c") {
        throw new Error("boom");
      }
    });

    expect(attempted.sort()).toEqual(["a", "b", "c", "d"]);
    expect(result.failedKeys.sort()).toEqual(["a", "c"]);
  });

  it("never runs more than `concurrency` deletes at once", async () => {
    const { tracker, deleteOne } = trackingDelete();

    await deleteKeysWithConcurrency(["a", "b", "c", "d", "e"], deleteOne, 2);

    expect(tracker.maxActive).toBe(2);
  });

  it("runs at most 5 deletes at once by default", async () => {
    const { tracker, deleteOne } = trackingDelete();

    await deleteKeysWithConcurrency(
      Array.from({ length: 12 }, (_, i) => `key-${i}`),
      deleteOne
    );

    expect(tracker.maxActive).toBe(5);
  });
});
