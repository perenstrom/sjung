import type { DeleteObjectsResult } from "@/lib/object-storage";

/**
 * What the stores for a Group's objects share: the Group's storage prefix,
 * which deleting the Group sweeps (`deleteGroupFiles`), and best-effort
 * deletes that log instead of throwing (ADR-0005).
 */

const FAILED_KEYS_LOG_SAMPLE_SIZE = 5;

/** Every object stored for the Group lives under this prefix. */
export function groupStoragePrefix(groupId: string): string {
  return `groups/${groupId}/`;
}

/** Runs a best-effort storage delete, logging what it couldn't remove instead of throwing. */
export async function cleanUpStorage(
  operation: string,
  context: Record<string, string>,
  run: () => Promise<DeleteObjectsResult>,
) {
  try {
    const result = await run();
    if (result.failedCount > 0) {
      console.error(`${operation} left objects in storage`, {
        ...context,
        failedCount: result.failedCount,
        totalCount: result.totalCount,
        failedKeysSample: result.failedKeys.slice(0, FAILED_KEYS_LOG_SAMPLE_SIZE),
      });
    }
  } catch (error) {
    console.error(`${operation} could not clean up storage`, { ...context, error });
  }
}
