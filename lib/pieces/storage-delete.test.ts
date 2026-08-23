import { describe, expect, it, vi } from "vitest";

import {
  deleteR2ObjectsOrThrow,
  deleteR2ObjectsWithConcurrency,
  type StorageDeletePort,
} from "@/lib/pieces/storage-delete";

function createFakePort(failingKeys: Iterable<string> = []): StorageDeletePort {
  const failing = new Set(failingKeys);
  return {
    async deleteObject(key: string) {
      if (failing.has(key)) {
        throw new Error(`boom: ${key}`);
      }
    },
  };
}

describe("deleteR2ObjectsWithConcurrency", () => {
  it("returns an empty result without touching the port for an empty key list", async () => {
    const deleteObject = vi.fn();
    const result = await deleteR2ObjectsWithConcurrency([], { port: { deleteObject } });

    expect(result).toEqual({ totalCount: 0, failedCount: 0, failedKeys: [] });
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("reports zero failures when every delete succeeds", async () => {
    const port = createFakePort();
    const result = await deleteR2ObjectsWithConcurrency(["a", "b", "c"], { port });

    expect(result).toEqual({ totalCount: 3, failedCount: 0, failedKeys: [] });
  });

  it("collects failed keys instead of throwing", async () => {
    const port = createFakePort(["b"]);
    const result = await deleteR2ObjectsWithConcurrency(["a", "b", "c"], { port });

    expect(result).toEqual({ totalCount: 3, failedCount: 1, failedKeys: ["b"] });
  });

  it("attempts every key even after some fail", async () => {
    const attempted: string[] = [];
    const port: StorageDeletePort = {
      async deleteObject(key: string) {
        attempted.push(key);
        if (key === "a" || key === "c") {
          throw new Error("boom");
        }
      },
    };

    const result = await deleteR2ObjectsWithConcurrency(["a", "b", "c", "d"], { port });

    expect(attempted.sort()).toEqual(["a", "b", "c", "d"]);
    expect(result.failedCount).toBe(2);
    expect(result.failedKeys.sort()).toEqual(["a", "c"]);
  });

  it("never runs more than `concurrency` deletes at once", async () => {
    let active = 0;
    let maxActive = 0;
    const port: StorageDeletePort = {
      async deleteObject() {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 0));
        active -= 1;
      },
    };

    await deleteR2ObjectsWithConcurrency(["a", "b", "c", "d", "e"], {
      port,
      concurrency: 2,
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("defaults to a concurrency of 5 batches", async () => {
    let active = 0;
    let maxActive = 0;
    const port: StorageDeletePort = {
      async deleteObject() {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 0));
        active -= 1;
      },
    };

    await deleteR2ObjectsWithConcurrency(
      Array.from({ length: 12 }, (_, i) => `key-${i}`),
      { port }
    );

    expect(maxActive).toBeLessThanOrEqual(5);
  });
});

describe("deleteR2ObjectsOrThrow", () => {
  it("resolves without throwing when every delete succeeds", async () => {
    const port = createFakePort();

    await expect(
      deleteR2ObjectsOrThrow(["a", "b"], "kunde inte ta bort", { port })
    ).resolves.toBeUndefined();
  });

  it("throws the given error message when any delete fails", async () => {
    const port = createFakePort(["a"]);

    await expect(
      deleteR2ObjectsOrThrow(["a", "b"], "kunde inte ta bort", { port })
    ).rejects.toThrow("kunde inte ta bort");
  });

  it("invokes onFailure with the failure details before throwing", async () => {
    const port = createFakePort(["a", "b"]);
    const onFailure = vi.fn();

    await expect(
      deleteR2ObjectsOrThrow(["a", "b", "c"], "kunde inte ta bort", {
        port,
        onFailure,
      })
    ).rejects.toThrow("kunde inte ta bort");

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith({
      totalCount: 3,
      failedCount: 2,
      failedKeys: ["a", "b"],
    });
  });

  it("does not invoke onFailure when every delete succeeds", async () => {
    const port = createFakePort();
    const onFailure = vi.fn();

    await deleteR2ObjectsOrThrow(["a", "b"], "kunde inte ta bort", {
      port,
      onFailure,
    });

    expect(onFailure).not.toHaveBeenCalled();
  });
});
