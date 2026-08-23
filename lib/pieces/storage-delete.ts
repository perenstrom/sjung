import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Bucket, getR2Client } from "@/lib/r2";

const DEFAULT_DELETE_CONCURRENCY = 5;

export interface StorageDeletePort {
  deleteObject(key: string): Promise<void>;
}

export function createR2StorageDeletePort(): StorageDeletePort {
  return {
    async deleteObject(key: string) {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
        })
      );
    },
  };
}

export type DeleteR2ObjectsResult = {
  totalCount: number;
  failedCount: number;
  failedKeys: string[];
};

type DeleteR2ObjectsOptions = {
  concurrency?: number;
  port?: StorageDeletePort;
};

export async function deleteR2ObjectsWithConcurrency(
  objectKeys: string[],
  options: DeleteR2ObjectsOptions = {}
): Promise<DeleteR2ObjectsResult> {
  if (objectKeys.length === 0) {
    return { totalCount: 0, failedCount: 0, failedKeys: [] };
  }

  const { concurrency = DEFAULT_DELETE_CONCURRENCY, port = createR2StorageDeletePort() } = options;
  const batchSize = Math.max(1, Math.floor(concurrency));
  let failedCount = 0;
  const failedKeys: string[] = [];

  for (let index = 0; index < objectKeys.length; index += batchSize) {
    const batch = objectKeys.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map((key) => port.deleteObject(key)));

    results.forEach((result, resultIndex) => {
      if (result.status === "rejected") {
        failedCount += 1;
        failedKeys.push(batch[resultIndex]);
      }
    });
  }

  return {
    totalCount: objectKeys.length,
    failedCount,
    failedKeys,
  };
}

type DeleteR2ObjectsOrThrowOptions = DeleteR2ObjectsOptions & {
  onFailure?: (result: DeleteR2ObjectsResult) => void;
};

// Storage-first, refuse-on-partial-failure: call before any DB write that depends on the deletion succeeding.
export async function deleteR2ObjectsOrThrow(
  objectKeys: string[],
  errorMessage: string,
  options: DeleteR2ObjectsOrThrowOptions = {}
): Promise<void> {
  const { onFailure, ...deleteOptions } = options;
  const result = await deleteR2ObjectsWithConcurrency(objectKeys, deleteOptions);
  if (result.failedCount > 0) {
    onFailure?.(result);
    throw new Error(errorMessage);
  }
}
