import { randomUUID } from "node:crypto";

import { inlineDisposition } from "@/lib/content-disposition";
import { cleanUpStorage, groupStoragePrefix } from "@/lib/groups/storage";
import { deleteObjects, headObject, signGet, signPut } from "@/lib/object-storage";
import prisma from "@/lib/prisma";
import { coverImageRefusal } from "@/lib/schemas/cover-image";

/**
 * The Cover image store: a Group's one optional Cover image in storage. It
 * owns the key layout, signed URLs, and the order of database writes and
 * object deletes. Callers check access; the store does the rest.
 *
 * The database comes first (ADR-0005): replacing or removing writes the
 * database, then deletes the old object as best effort. A failed delete is
 * logged, never thrown, so it leaves an invisible orphan, never a broken image.
 * Every object is under the Group's storage prefix, so deleting the Group
 * sweeps them up.
 */

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const VIEW_URL_EXPIRES_SECONDS = 60 * 5;

/** A Group's Cover image as stored, or `null` when it has none. */
export type StoredCoverImage = { key: string; contentType: string };

/** A presigned PUT for a new Cover image object of this type and size. */
export async function signCoverImageUpload(
  groupId: string,
  { contentType, size }: { contentType: string; size: number },
) {
  const storagePath = `${coverImagePrefix(groupId)}${randomUUID()}`;
  const uploadUrl = await signPut(storagePath, {
    contentType,
    size,
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
  });
  return { uploadUrl, storagePath, headers: { "content-type": contentType } };
}

/**
 * Makes a finished upload the Group's Cover image, then deletes the one it
 * replaces. Its type and size are read from storage, never taken from the
 * browser; an object that may not be a Cover image is refused and deleted.
 * Counts as a change to the Group's content.
 */
export async function setCoverImage(groupId: string, storagePath: string, userId: string) {
  if (!storagePath.startsWith(coverImagePrefix(groupId))) {
    throw new Error("Ogiltig filsökväg");
  }
  const current = await findCoverImage(groupId);
  if (current?.key === storagePath) {
    throw new Error("Bilden är redan gruppens omslagsbild");
  }

  const stored = await headObject(storagePath);
  if (!stored) {
    throw new Error("Bilden hittades inte i lagringen");
  }
  const refusal = coverImageRefusal(stored);
  if (refusal) {
    await cleanUpStorage("setCoverImage", { groupId }, () => deleteObjects([storagePath]));
    throw new Error(refusal);
  }

  await prisma.group.update({
    where: { id: groupId },
    data: {
      coverImageKey: storagePath,
      coverImageContentType: stored.contentType,
      homeUpdatedAt: new Date(),
      updatedById: userId,
    },
  });
  if (current) {
    await cleanUpStorage("setCoverImage", { groupId }, () => deleteObjects([current.key]));
  }
}

/** Clears the Group's Cover image, then deletes its object. Without one, nothing changes. */
export async function removeCoverImage(groupId: string, userId: string) {
  const current = await findCoverImage(groupId);
  if (!current) {
    return;
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { coverImageKey: null, coverImageContentType: null, homeUpdatedAt: new Date(), updatedById: userId },
  });
  await cleanUpStorage("removeCoverImage", { groupId }, () => deleteObjects([current.key]));
}

export async function findCoverImage(groupId: string): Promise<StoredCoverImage | null> {
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { coverImageKey: true, coverImageContentType: true },
  });
  return toStoredCoverImage(group);
}

/** The Cover image from a Group row's columns. */
export function toStoredCoverImage({
  coverImageKey,
  coverImageContentType,
}: {
  coverImageKey: string | null;
  coverImageContentType: string | null;
}): StoredCoverImage | null {
  return coverImageKey && coverImageContentType ? { key: coverImageKey, contentType: coverImageContentType } : null;
}

/** A short-lived signed URL the browser shows the Cover image from. */
export async function signCoverImageView(image: StoredCoverImage) {
  return signGet(image.key, {
    contentType: image.contentType,
    contentDisposition: inlineDisposition("omslagsbild"),
    expiresInSeconds: VIEW_URL_EXPIRES_SECONDS,
  });
}

function coverImagePrefix(groupId: string): string {
  return `${groupStoragePrefix(groupId)}cover-image/`;
}
