import { randomUUID } from "node:crypto";

import { Prisma } from "@/app/generated/prisma/client";
import { FileConversionState } from "@/app/generated/prisma/enums";
import { attachmentDisposition, inlineDisposition } from "@/lib/content-disposition";
import { needsConversion } from "@/lib/file-formats";
import { convertMuseScore, MXL_MIME_TYPE } from "@/lib/musescore-converter";
import {
  deleteObjects,
  deletePrefix,
  getObject,
  headObject,
  putObject,
  signGet,
  signPut,
  type DeleteObjectsResult,
  type StoredObject,
} from "@/lib/object-storage";
import { PLAYER_SOUNDFONT_KEY } from "@/lib/player/soundfont";
import prisma from "@/lib/prisma";
import { assertAllowedStoredFile } from "@/lib/schemas/files";

/**
 * The Piece file store: everything about a File's stored content. It owns the
 * key layout, signed URLs, and the order of File row writes and object
 * deletes. Callers check access and find the rows; the store does the rest.
 *
 * The database comes first (ADR-0005): a removal writes the database, then
 * deletes the old objects as best effort. A failed object delete is logged,
 * never thrown, so it leaves an invisible orphan rather than a broken File.
 *
 * A MuseScore File also has a converted copy the player plays (ADR-0009),
 * stored next to it with no row of its own. Adding or replacing one leaves it
 * pending; the caller then runs `convertFile` once the response is sent.
 */

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const DOWNLOAD_URL_EXPIRES_SECONDS = 60 * 5;
/**
 * The player keeps reading the file for as long as it is open, by range
 * requests to the same URL, so its URL outlives a long practice session.
 */
const PLAYBACK_URL_EXPIRES_SECONDS = 60 * 60 * 6;
const FAILED_KEYS_LOG_SAMPLE_SIZE = 5;

/** The Piece a File belongs to, as far as storage cares. */
export type StorePiece = { id: string; groupId: string };

/** A File as the store needs it. */
export type StoreFile = {
  id: string;
  storagePath: string;
  conversionState: FileConversionState | null;
  piece: StorePiece;
};

/** Selects a Piece as the store needs it, e.g. for `findInGroup`. */
export const STORE_PIECE_SELECT = { id: true, groupId: true } as const;

/** Selects a File as the store needs it, e.g. for `findInGroup`. */
export const STORE_FILE_SELECT = {
  id: true,
  storagePath: true,
  conversionState: true,
  piece: { select: STORE_PIECE_SELECT },
} as const;

/**
 * What the browser says it uploaded, as reported back at finalize. Its size
 * and type are read from storage, never taken from the client.
 */
export type FinishedUpload = { storagePath: string; fileName: string };

const PATH_IN_USE = "Filen finns redan";

/** A presigned PUT for a new object under the Piece's prefix. */
export async function signUpload(
  piece: StorePiece,
  { fileName, mimeType, size }: { fileName: string; mimeType: string; size: number },
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

/** A File just added or replaced, and whether it waits for `convertFile`. */
export type SavedFile = { id: string; pendingConversion: boolean };

/** Creates a File on the Piece for a finished upload. */
export async function addFile(
  piece: StorePiece,
  upload: FinishedUpload,
  { displayName, category, userId }: { displayName: string; category: string | null; userId: string },
): Promise<SavedFile> {
  const stored = await verifyUpload(piece, upload);

  const file = await rejectingReusedPath(() =>
    prisma.file.create({
      data: {
        pieceId: piece.id,
        displayName,
        category,
        fileName: upload.fileName,
        storagePath: upload.storagePath,
        mimeType: stored.contentType,
        size: stored.size,
        conversionState: initialConversionState(upload),
        createdById: userId,
        updatedById: userId,
      },
      select: { id: true, conversionState: true },
    }),
  );
  return savedFile(file);
}

/**
 * Points the File at a finished upload, then removes its old content and any
 * copy converted from it. A MuseScore File is pending again until the new
 * content is converted, never shown as the old version.
 */
export async function replaceFile(file: StoreFile, upload: FinishedUpload, userId: string): Promise<SavedFile> {
  const stored = await verifyUpload(file.piece, upload);

  const replaced = await rejectingReusedPath(() =>
    prisma.file.update({
      where: { id: file.id },
      data: {
        fileName: upload.fileName,
        mimeType: stored.contentType,
        size: stored.size,
        storagePath: upload.storagePath,
        conversionState: initialConversionState(upload),
        convertedStoragePath: null,
        updatedById: userId,
      },
      select: { id: true, conversionState: true },
    }),
  );

  await cleanUp("replaceFile", { fileId: file.id }, () => deleteObjects(storedKeysOf(file)));
  return savedFile(replaced);
}

/** Deletes the File and its stored content, its converted copy included. */
export async function deleteFile(file: Pick<StoreFile, "id" | "storagePath" | "conversionState">) {
  await prisma.file.delete({ where: { id: file.id } });
  await cleanUp("deleteFile", { fileId: file.id }, () => deleteObjects(storedKeysOf(file)));
}

/**
 * Converts a pending MuseScore File for the player and stores the copy next
 * to it: ready if the worker converts it, failed otherwise. Never throws; a
 * failure is logged. If the File was replaced or deleted meanwhile, the copy
 * is of content it no longer has, so it is removed again and the File left
 * as it is.
 */
export async function convertFile(fileId: string) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { storagePath: true, conversionState: true },
  });
  if (file?.conversionState !== FileConversionState.PENDING) return;

  const convertedStoragePath = convertedStoragePathOf(file.storagePath);
  let converted = false;
  try {
    const score = await getObject(file.storagePath);
    if (!score) {
      throw new Error("The File's content is not in storage");
    }
    await putObject(convertedStoragePath, await convertMuseScore(score), { contentType: MXL_MIME_TYPE });
    converted = true;
  } catch (error) {
    console.error("convertFile could not convert the File", { fileId, error });
  }

  try {
    const { count } = await prisma.file.updateMany({
      where: { id: fileId, storagePath: file.storagePath, conversionState: FileConversionState.PENDING },
      data: converted
        ? { conversionState: FileConversionState.READY, convertedStoragePath }
        : { conversionState: FileConversionState.FAILED },
    });
    if (count === 0 && converted) {
      await cleanUp("convertFile", { fileId }, () => deleteObjects([convertedStoragePath]));
    }
  } catch (error) {
    console.error("convertFile could not record the conversion", { fileId, error });
  }
}

/**
 * Deletes everything stored under a Piece the caller has just deleted,
 * including uploads that were never finalized.
 */
export async function deletePieceFiles(piece: StorePiece) {
  await cleanUp("deletePieceFiles", { pieceId: piece.id }, () => deletePrefix(pieceStoragePrefix(piece)));
}

/**
 * Deletes everything stored under a Group the caller has just deleted,
 * including uploads that were never finalized.
 */
export async function deleteGroupFiles(groupId: string) {
  await cleanUp("deleteGroupFiles", { groupId }, () => deletePrefix(groupStoragePrefix(groupId)));
}

function initialConversionState({ fileName }: FinishedUpload): FileConversionState | null {
  return needsConversion({ fileName }) ? FileConversionState.PENDING : null;
}

function savedFile({ id, conversionState }: { id: string; conversionState: FileConversionState | null }): SavedFile {
  return { id, pendingConversion: conversionState === FileConversionState.PENDING };
}

/** Where the MusicXML converted from the File's content is stored; next to it, so it goes with its Piece. */
export function convertedStoragePathOf(storagePath: string): string {
  return `${storagePath}.mxl`;
}

/**
 * Every object stored for the File: its content and, if it is converted, its
 * copy. Derived from the content's key rather than read from the row, since a
 * conversion may store the copy after the caller read the File as pending.
 */
function storedKeysOf(file: Pick<StoreFile, "storagePath" | "conversionState">): string[] {
  return file.conversionState === null
    ? [file.storagePath]
    : [file.storagePath, convertedStoragePathOf(file.storagePath)];
}

/** A File's stored content, as signing needs it. */
type SignableFile = { storagePath: string; fileName: string; mimeType: string };

/** A presigned GET that downloads the File under its original name. */
export async function signDownload(file: SignableFile) {
  return signGet(file.storagePath, {
    contentType: file.mimeType,
    contentDisposition: attachmentDisposition(file.fileName),
    expiresInSeconds: DOWNLOAD_URL_EXPIRES_SECONDS,
  });
}

/**
 * A signed URL the player reads a Playable File from while it is open: the
 * File itself, or the copy converted from it when it has one.
 */
export async function signPlayback(file: SignableFile & { convertedStoragePath: string | null }) {
  if (file.convertedStoragePath) {
    return signGet(file.convertedStoragePath, {
      contentType: MXL_MIME_TYPE,
      contentDisposition: inlineDisposition(`${file.fileName.replace(/\.[^.]*$/, "")}.mxl`),
      expiresInSeconds: PLAYBACK_URL_EXPIRES_SECONDS,
    });
  }
  return signGet(file.storagePath, {
    contentType: file.mimeType,
    contentDisposition: inlineDisposition(file.fileName),
    expiresInSeconds: PLAYBACK_URL_EXPIRES_SECONDS,
  });
}

/**
 * A signed URL the player reads its soundfont from (ADR-0010), alongside a
 * MIDI File's playback URL and lasting as long.
 */
export async function signSoundfont() {
  return signGet(PLAYER_SOUNDFONT_KEY, {
    contentType: "audio/x-sf3",
    contentDisposition: inlineDisposition("soundfont.sf3"),
    expiresInSeconds: PLAYBACK_URL_EXPIRES_SECONDS,
  });
}

function groupStoragePrefix(groupId: string): string {
  return `groups/${groupId}/`;
}

function pieceStoragePrefix(piece: StorePiece): string {
  return `${groupStoragePrefix(piece.groupId)}pieces/${piece.id}/`;
}

/**
 * The stored object a finalize points at, once it is known to be a new,
 * allowed upload under the Piece. Throws a Swedish refusal otherwise.
 */
async function verifyUpload(piece: StorePiece, { storagePath, fileName }: FinishedUpload): Promise<StoredObject> {
  if (!storagePath.startsWith(pieceStoragePrefix(piece))) {
    throw new Error("Ogiltig filsökväg");
  }
  // A converted copy is a File's too, so it can't become a File of its own.
  if (
    await prisma.file.findFirst({
      where: { OR: [{ storagePath }, { convertedStoragePath: storagePath }] },
      select: { id: true },
    })
  ) {
    throw new Error(PATH_IN_USE);
  }

  const stored = await headObject(storagePath);
  if (!stored) {
    throw new Error("Filen hittades inte i lagringen");
  }
  assertAllowedStoredFile({ ...stored, fileName });
  return stored;
}

/** Runs a File write, turning a lost race for the same `storagePath` into the reuse refusal. */
async function rejectingReusedPath<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(PATH_IN_USE);
    }
    throw error;
  }
}

/** Runs a best-effort storage delete, logging what it couldn't remove instead of throwing. */
async function cleanUp(operation: string, context: Record<string, string>, run: () => Promise<DeleteObjectsResult>) {
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
