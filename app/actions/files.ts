"use server";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { readGroupSlugInput } from "@/lib/actions/input";
import { requireFileInGroup, requirePieceInGroup } from "@/lib/actions/guards";
import prisma from "@/lib/prisma";
import { getR2Bucket, getR2Client, sanitizeFileName } from "@/lib/r2";
import {
  parseCreatePieceFileUploadFromFormData,
  parseFileIdFromFormData,
  parseFinalizePieceFileUploadFromFormData,
  parseUpdatePieceFileDisplayNameFromFormData,
} from "@/lib/schemas/files";
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupRoute,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const DOWNLOAD_URL_EXPIRES_SECONDS = 60 * 5;

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = readGroupSlugInput(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const { pieceId, fileName, mimeType, size } =
    parseCreatePieceFileUploadFromFormData(formData);

  await requirePieceInGroup(pieceId, groupId);

  const safeName = sanitizeFileName(fileName) || "fil";
  const storagePath = `groups/${groupId}/pieces/${pieceId}/${randomUUID()}-${safeName}`;
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

export async function finalizePieceFileUpload(formData: FormData) {
  const groupSlug = readGroupSlugInput(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const { pieceId, fileName, storagePath, mimeType, size, displayName } =
    parseFinalizePieceFileUploadFromFormData(formData);

  await requirePieceInGroup(pieceId, groupId);

  const expectedPrefix = `groups/${groupId}/pieces/${pieceId}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    throw new Error("Ogiltig filsökväg");
  }

  const resolvedDisplayName = displayName ?? fileName;

  await prisma.file.create({
    data: {
      pieceId,
      displayName: resolvedDisplayName,
      fileName,
      storagePath,
      mimeType,
      size,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, pieceId);
}

export async function createPieceFileDownloadUrl(formData: FormData) {
  const groupSlug = readGroupSlugInput(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const fileId = parseFileIdFromFormData(formData);

  const file = await requireFileInGroup(fileId, groupId, {
    select: {
      storagePath: true,
      fileName: true,
      mimeType: true,
    },
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
  const groupSlug = readGroupSlugInput(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const { fileId, displayName } =
    parseUpdatePieceFileDisplayNameFromFormData(formData);

  const file = await requireFileInGroup(fileId, groupId, {
    select: { id: true, pieceId: true },
  });

  await prisma.file.update({
    where: { id: file.id },
    data: {
      displayName,
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, file.pieceId);
}

export async function deletePieceFile(formData: FormData) {
  const groupSlug = readGroupSlugInput(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const fileId = parseFileIdFromFormData(formData);

  const file = await requireFileInGroup(fileId, groupId, {
    select: {
      id: true,
      storagePath: true,
      pieceId: true,
    },
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

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, file.pieceId);
}
