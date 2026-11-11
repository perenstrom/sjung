import type { DeleteObjectsResult, StoredObject } from "@/lib/object-storage";

// Shared stand-in for `@/lib/object-storage`, swapped in for every integration
// test by `vi.mock` in ./setup.ts so no test can reach real storage. Signed
// URLs are only recognisable strings: tests put objects in with
// `putStoredObject` instead of fetching them.

let objects = new Map<string, StoredObject>();
let failingDeletes = new Set<string>();

export async function signPut(
  key: string,
  { contentType, size }: { contentType: string; size: number; expiresInSeconds: number }
): Promise<string> {
  return `fake-storage://put/${key}?type=${encodeURIComponent(contentType)}&size=${size}`;
}

export async function signGet(
  key: string,
  { contentDisposition }: { contentType: string; contentDisposition: string; expiresInSeconds: number }
): Promise<string> {
  return `fake-storage://get/${key}?disposition=${encodeURIComponent(contentDisposition)}`;
}

export async function headObject(key: string): Promise<StoredObject | null> {
  return objects.get(key) ?? null;
}

export async function deleteObjects(keys: string[]): Promise<DeleteObjectsResult> {
  const failedKeys: string[] = [];
  for (const key of keys) {
    if (failingDeletes.has(key)) {
      failedKeys.push(key);
    } else {
      objects.delete(key);
    }
  }
  return { totalCount: keys.length, failedCount: failedKeys.length, failedKeys };
}

export async function deletePrefix(prefix: string): Promise<DeleteObjectsResult> {
  return deleteObjects(storedKeys().filter((key) => key.startsWith(prefix)));
}

/** Stands in for the browser's PUT to a signed upload URL. */
export function putStoredObject(
  key: string,
  object: StoredObject = { size: 1024, contentType: "application/pdf" }
) {
  objects.set(key, object);
}

/** Every key in storage, sorted. */
export function storedKeys(): string[] {
  return [...objects.keys()].sort();
}

/** Makes every later delete of `key` fail; the object stays. */
export function failDeletesOf(key: string) {
  failingDeletes.add(key);
}

export function resetFakeObjectStorage() {
  objects = new Map();
  failingDeletes = new Set();
}
