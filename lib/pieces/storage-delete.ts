import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Bucket, getR2Client } from "@/lib/r2";

const DEFAULT_DELETE_CONCURRENCY = 5;

export type DeleteR2ObjectsResult = {
  totalCount: number;
  failedCount: number;
  failedKeys: string[];
};

export async function deleteR2ObjectsWithConcurrency(
  objectKeys: string[],
  concurrency: number = DEFAULT_DELETE_CONCURRENCY
): Promise<DeleteR2ObjectsResult> {
  if (objectKeys.length === 0) {
    return { totalCount: 0, failedCount: 0, failedKeys: [] };
  }

  const batchSize = Math.max(1, Math.floor(concurrency));
  const client = getR2Client();
  const bucket = getR2Bucket();
  let failedCount = 0;
  const failedKeys: string[] = [];

  for (let index = 0; index < objectKeys.length; index += batchSize) {
    const batch = objectKeys.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((key) =>
        client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        )
      )
    );

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
