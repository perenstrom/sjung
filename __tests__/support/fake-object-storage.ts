import type { DeleteObjectsResult, StoredObject } from "@/lib/object-storage";

// Shared stand-in for `@/lib/object-storage`, swapped in for every integration
// test by `vi.mock` in ./setup.ts so no test can reach real storage. Signed
// URLs are only recognisable strings: tests put objects in with
// `putStoredObject` instead of fetching them.

let objects = new Map<string, StoredObject>();
let bodies = new Map<string, Uint8Array>();
let failingDeletes = new Set<string>();

export async function signPut(
  key: string,
  { contentType, size }: { contentType: string; size: number; expiresInSeconds: number },
): Promise<string> {
  return `fake-storage://put/${key}?type=${encodeURIComponent(contentType)}&size=${size}`;
}

export async function signGet(
  key: string,
  { contentDisposition }: { contentType: string; contentDisposition: string; expiresInSeconds: number },
): Promise<string> {
  return `fake-storage://get/${key}?disposition=${encodeURIComponent(contentDisposition)}`;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  { contentType }: { contentType: string },
): Promise<void> {
  objects.set(key, { size: body.byteLength, contentType });
  bodies.set(key, body);
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  return storedBody(key);
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
      bodies.delete(key);
    }
  }
  return { totalCount: keys.length, failedCount: failedKeys.length, failedKeys };
}

export async function deletePrefix(prefix: string): Promise<DeleteObjectsResult> {
  return deleteObjects(storedKeys().filter((key) => key.startsWith(prefix)));
}

/** Stands in for the browser's PUT to a signed upload URL. Without a `body`, the object reads as `size` zero bytes. */
export function putStoredObject(
  key: string,
  object: StoredObject = { size: 1024, contentType: "application/pdf" },
  body?: Uint8Array,
) {
  objects.set(key, object);
  if (body) {
    bodies.set(key, body);
  } else {
    bodies.delete(key);
  }
}

/** The stored object's bytes, or `null` when there is no object at `key`. */
export function storedBody(key: string): Uint8Array | null {
  const object = objects.get(key);
  return object ? (bodies.get(key) ?? new Uint8Array(object.size)) : null;
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
  bodies = new Map();
  failingDeletes = new Set();
}
