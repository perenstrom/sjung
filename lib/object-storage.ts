import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage: the only module that talks to R2. Integration tests swap in
 * `__tests__/support/fake-object-storage.ts`, which exports the same functions.
 */

export type StoredObject = { size: number; contentType: string };

/** How a bulk delete went. A failed key never throws; it is reported here. */
export type DeleteObjectsResult = {
  totalCount: number;
  failedCount: number;
  failedKeys: string[];
};

const DELETE_CONCURRENCY = 5;

/** A presigned PUT that only accepts an object of this type and size. */
export async function signPut(
  key: string,
  { contentType, size, expiresInSeconds }: { contentType: string; size: number; expiresInSeconds: number }
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/** A presigned GET that serves the object with these response headers. */
export async function signGet(
  key: string,
  {
    contentType,
    contentDisposition,
    expiresInSeconds,
  }: { contentType: string; contentDisposition: string; expiresInSeconds: number }
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentType: contentType,
    ResponseContentDisposition: contentDisposition,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/** The object's size and type, or `null` when there is no object at `key`. */
export async function headObject(key: string): Promise<StoredObject | null> {
  try {
    const head = await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return {
      size: head.ContentLength ?? 0,
      contentType: head.ContentType ?? "",
    };
  } catch (error) {
    if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/** Deletes every key, a few at a time, and reports the ones that failed. */
export async function deleteObjects(keys: string[]): Promise<DeleteObjectsResult> {
  return deleteKeysWithConcurrency(keys, async (key) => {
    await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  });
}

/** Deletes every object whose key starts with `prefix`. Throws only if listing fails. */
export async function deletePrefix(prefix: string): Promise<DeleteObjectsResult> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await getClient().send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) {
        keys.push(object.Key);
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleteObjects(keys);
}

/**
 * Runs `deleteOne` over every key, at most `concurrency` at once, collecting
 * the keys that failed instead of stopping at the first. Exported for its test.
 */
export async function deleteKeysWithConcurrency(
  keys: string[],
  deleteOne: (key: string) => Promise<void>,
  concurrency = DELETE_CONCURRENCY
): Promise<DeleteObjectsResult> {
  const batchSize = Math.max(1, Math.floor(concurrency));
  const failedKeys: string[] = [];

  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map((key) => deleteOne(key)));
    results.forEach((result, resultIndex) => {
      if (result.status === "rejected") {
        failedKeys.push(batch[resultIndex]);
      }
    });
  }

  return { totalCount: keys.length, failedCount: failedKeys.length, failedKeys };
}

type RequiredR2EnvVar =
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_BUCKET"
  | "R2_ENDPOINT";

let cachedClient: S3Client | null = null;

function getRequiredEnv(name: RequiredR2EnvVar): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Saknar miljövariabel: ${name}`);
  }
  return value.trim();
}

function getClient(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

function getBucket(): string {
  return getRequiredEnv("R2_BUCKET");
}
