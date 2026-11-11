import { randomUUID } from "node:crypto";

import {
  deleteObjects,
  deletePrefix,
  signGet,
  signPut,
  type DeleteObjectsResult,
} from "@/lib/object-storage";
import prisma from "@/lib/prisma";

/**
 * The Piece file store: everything about a File's stored content. It owns the
 * key layout, signed URLs, and the order of File row writes and object
 * deletes. Callers check access and find the rows; the store does the rest.
 *
 * The database comes first (ADR-0005): a removal writes the database, then
 * deletes the old objects as best effort. A failed object delete is logged,
 * never thrown, so it leaves an invisible orphan rather than a broken File.
 */

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const DOWNLOAD_URL_EXPIRES_SECONDS = 60 * 5;
const FAILED_KEYS_LOG_SAMPLE_SIZE = 5;

/** The Piece a File belongs to, as far as storage cares. */
export type StorePiece = { id: string; groupId: string };

/** A File as the store needs it. */
export type StoreFile = { id: string; storagePath: string; piece: StorePiece };

/** What the browser uploaded, as reported back at finalize. */
export type FinishedUpload = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  size: number;
};

/** A presigned PUT for a new object under the Piece's prefix. */
export async function signUpload(
  piece: StorePiece,
  { fileName, mimeType, size }: { fileName: string; mimeType: string; size: number }
) {
  const storagePath = `${pieceStoragePrefix(piece)}${randomUUID()}-${sanitizeFileName(fileName) || "fil"}`;
  const uploadUrl = await signPut(storagePath, {
    contentType: mimeType,
    size,
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
  });

  return {
    uploadUrl,
    storagePath,
    headers: { "content-type": mimeType },
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
  };
}

/** Creates a File on the Piece for a finished upload. */
export async function addFile(
  piece: StorePiece,
  upload: FinishedUpload,
  { displayName, userId }: { displayName: string; userId: string }
) {
  assertUnderPiece(piece, upload.storagePath);

  await prisma.file.create({
    data: {
      pieceId: piece.id,
      displayName,
      fileName: upload.fileName,
      storagePath: upload.storagePath,
      mimeType: upload.mimeType,
      size: upload.size,
      createdById: userId,
      updatedById: userId,
    },
  });
}

/** Points the File at a finished upload and removes its old content. */
export async function replaceFile(file: StoreFile, upload: FinishedUpload, userId: string) {
  assertUnderPiece(file.piece, upload.storagePath);

  await prisma.file.update({
    where: { id: file.id },
    data: {
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.size,
      storagePath: upload.storagePath,
      updatedById: userId,
    },
  });

  await cleanUp("replaceFile", { fileId: file.id }, () => deleteObjects([file.storagePath]));
}

/** Deletes the File and its stored content. */
export async function deleteFile(file: Pick<StoreFile, "id" | "storagePath">) {
  await prisma.file.delete({ where: { id: file.id } });
  await cleanUp("deleteFile", { fileId: file.id }, () => deleteObjects([file.storagePath]));
}

/**
 * Deletes everything stored under a Piece the caller has just deleted,
 * including uploads that were never finalized.
 */
export async function deletePieceFiles(piece: StorePiece) {
  await cleanUp("deletePieceFiles", { pieceId: piece.id }, () =>
    deletePrefix(pieceStoragePrefix(piece))
  );
}

/**
 * Deletes everything stored under a Group the caller has just deleted,
 * including uploads that were never finalized.
 */
export async function deleteGroupFiles(groupId: string) {
  await cleanUp("deleteGroupFiles", { groupId }, () => deletePrefix(groupStoragePrefix(groupId)));
}

/** A presigned GET that downloads the File under its original name. */
export async function signDownload(file: { storagePath: string; fileName: string; mimeType: string }) {
  return signGet(file.storagePath, {
    contentType: file.mimeType,
    contentDisposition: `attachment; filename="${file.fileName}"`,
    expiresInSeconds: DOWNLOAD_URL_EXPIRES_SECONDS,
  });
}

function groupStoragePrefix(groupId: string): string {
  return `groups/${groupId}/`;
}

function pieceStoragePrefix(piece: StorePiece): string {
  return `${groupStoragePrefix(piece.groupId)}pieces/${piece.id}/`;
}

function assertUnderPiece(piece: StorePiece, storagePath: string) {
  if (!storagePath.startsWith(pieceStoragePrefix(piece))) {
    throw new Error("Ogiltig filsökväg");
  }
}

/** Runs a best-effort storage delete, logging what it couldn't remove instead of throwing. */
async function cleanUp(
  operation: string,
  context: Record<string, string>,
  run: () => Promise<DeleteObjectsResult>
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

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
