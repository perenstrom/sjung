import { randomUUID } from "node:crypto";

import { deleteObjects, signGet, signPut } from "@/lib/object-storage";
import prisma from "@/lib/prisma";

/**
 * The Piece file store: everything about a File's stored content. It owns the
 * key layout, signed URLs, and the order of File row writes and object
 * deletes. Callers check access and find the rows; the store does the rest.
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

  await deleteOrThrow([file.storagePath], "Kunde inte ta bort den gamla filen från lagringen");

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
}

/** Deletes the File and its stored content. */
export async function deleteFile(file: Pick<StoreFile, "id" | "storagePath">) {
  await deleteOrThrow([file.storagePath], "Kunde inte ta bort filen från lagringen");
  await prisma.file.delete({ where: { id: file.id } });
}

/** Deletes the stored content of every File on the Piece. */
export async function deletePieceFiles(piece: StorePiece) {
  const files = await prisma.file.findMany({
    where: { pieceId: piece.id },
    select: { storagePath: true },
  });
  await deleteOrThrow(
    files.map((file) => file.storagePath),
    "Kunde inte ta bort en eller flera filer från lagringen"
  );
}

/** A presigned GET that downloads the File under its original name. */
export async function signDownload(file: { storagePath: string; fileName: string; mimeType: string }) {
  return signGet(file.storagePath, {
    contentType: file.mimeType,
    contentDisposition: `attachment; filename="${file.fileName}"`,
    expiresInSeconds: DOWNLOAD_URL_EXPIRES_SECONDS,
  });
}

function pieceStoragePrefix(piece: StorePiece): string {
  return `groups/${piece.groupId}/pieces/${piece.id}/`;
}

function assertUnderPiece(piece: StorePiece, storagePath: string) {
  if (!storagePath.startsWith(pieceStoragePrefix(piece))) {
    throw new Error("Ogiltig filsökväg");
  }
}

async function deleteOrThrow(keys: string[], errorMessage: string) {
  const result = await deleteObjects(keys);
  if (result.failedCount > 0) {
    console.error("Failed to remove one or more stored objects", {
      failedCount: result.failedCount,
      totalCount: result.totalCount,
      failedKeysSample: result.failedKeys.slice(0, FAILED_KEYS_LOG_SAMPLE_SIZE),
    });
    throw new Error(errorMessage);
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
