"use server";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { findInGroup } from "@/lib/find-in-group";
import { deleteR2ObjectsOrThrow } from "@/lib/pieces/storage-delete";
import prisma from "@/lib/prisma";
import { getR2Bucket, getR2Client, sanitizeFileName } from "@/lib/r2";
import { parseWritableGroupSlugFromFormData } from "@/lib/schemas/people";
import {
  parseCreatePieceFileReplaceUploadFromFormData,
  parseCreatePieceFileUploadFromFormData,
  parseFileIdFromFormData,
  parseFinalizePieceFileReplaceFromFormData,
  parseFinalizePieceFileUploadFromFormData,
  parseUpdatePieceFileDisplayNameFromFormData,
} from "@/lib/schemas/files";
import { revalidatePieceRoutes } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runContentMutation } from "@/lib/tenant-group";

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const DOWNLOAD_URL_EXPIRES_SECONDS = 60 * 5;

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, mimeType, size } =
    parseCreatePieceFileUploadFromFormData(formData);

  return runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    const safeName = sanitizeFileName(fileName) || "fil";
    const storagePath = `groups/${groupId}/pieces/${piece.id}/${randomUUID()}-${safeName}`;
    return signUpload(storagePath, mimeType, size);
  });
}

export async function finalizePieceFileUpload(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, storagePath, mimeType, size, displayName } =
    parseFinalizePieceFileUploadFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    const expectedPrefix = `groups/${groupId}/pieces/${piece.id}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new Error("Ogiltig filsökväg");
    }

    const resolvedDisplayName = displayName ?? fileName;

    await prisma.file.create({
      data: {
        pieceId: piece.id,
        displayName: resolvedDisplayName,
        fileName,
        storagePath,
        mimeType,
        size,
        createdById: userId,
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function createPieceFileReplaceUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, mimeType, size } =
    parseCreatePieceFileReplaceUploadFromFormData(formData);

  return runContentMutation(groupSlug, async ({ groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, { select: { pieceId: true } });
    const safeName = sanitizeFileName(fileName) || "fil";
    const storagePath = `groups/${groupId}/pieces/${file.pieceId}/${randomUUID()}-${safeName}`;
    return signUpload(storagePath, mimeType, size);
  });
}

export async function finalizePieceFileReplace(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, storagePath, mimeType, size } =
    parseFinalizePieceFileReplaceFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, {
      select: { id: true, pieceId: true, storagePath: true },
    });
    const expectedPrefix = `groups/${groupId}/pieces/${file.pieceId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new Error("Ogiltig filsökväg");
    }

    await deleteR2ObjectsOrThrow(
      [file.storagePath],
      "Kunde inte ta bort den gamla filen från lagringen"
    );

    await prisma.file.update({
      where: { id: file.id },
      data: {
        fileName,
        mimeType,
        size,
        storagePath,
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, file.pieceId);
  });
}

/** A read: any Member may download, so this doesn't go through `runContentMutation`. */
export async function createPieceFileDownloadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const fileId = parseFileIdFromFormData(formData);

  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const file = await findInGroup(groupId, "file", fileId, {
    select: { storagePath: true, fileName: true, mimeType: true },
  });
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: file.storagePath,
    ResponseContentType: file.mimeType,
    ResponseContentDisposition: `attachment; filename="${file.fileName}"`,
  });
  const downloadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_URL_EXPIRES_SECONDS,
  });

  return { downloadUrl };
}

export async function updatePieceFileDisplayName(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, displayName } = parseUpdatePieceFileDisplayNameFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, {
      select: { id: true, pieceId: true },
    });
    await prisma.file.update({
      where: { id: file.id },
      data: {
        displayName,
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, file.pieceId);
  });
}

export async function deletePieceFile(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const fileId = parseFileIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, {
      select: { id: true, storagePath: true, pieceId: true },
    });
    try {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: file.storagePath,
        })
      );
    } catch {
      throw new Error("Kunde inte ta bort filen från lagringen");
    }

    await prisma.file.delete({
      where: { id: file.id },
    });

    await revalidatePieceRoutes(groupSlug, file.pieceId);
  });
}

/** A presigned PUT for one upload to `storagePath`. */
async function signUpload(storagePath: string, mimeType: string, size: number) {
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: storagePath,
    ContentType: mimeType,
    ContentLength: size,
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: UPLOAD_URL_EXPIRES_SECONDS,
  });

  return {
    uploadUrl,
    storagePath,
    headers: {
      "content-type": mimeType,
    },
    expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
  };
}
