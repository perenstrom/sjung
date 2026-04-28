"use server";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { readGroupSlugInput, readIdField, readOptionalString, readRequiredString } from "@/lib/actions/input";
import { requireFileInGroup, requirePieceInGroup } from "@/lib/actions/guards";
import prisma from "@/lib/prisma";
import { getR2Bucket, getR2Client, sanitizeFileName } from "@/lib/r2";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const DOWNLOAD_URL_EXPIRES_SECONDS = 60 * 5;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function readGroupSlug(formData: FormData): string {
  return readGroupSlugInput(formData);
}

function readFileSize(formData: FormData): number {
  const value = Number(readRequiredString(formData, "size", "Filstorlek saknas"));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Ogiltig filstorlek");
  }
  if (value > MAX_FILE_SIZE_BYTES) {
    throw new Error("Filen är för stor (max 50 MB)");
  }
  return value;
}

function readMimeType(formData: FormData): string {
  const mimeType = readRequiredString(formData, "mimeType", "Filtyp saknas");
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Filtypen stöds inte");
  }
  return mimeType;
}

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readIdField(formData, "pieceId", "Stycke saknas");
  const fileName = readRequiredString(formData, "fileName", "Filnamn saknas");
  const mimeType = readMimeType(formData);
  const size = readFileSize(formData);

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
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readIdField(formData, "pieceId", "Stycke saknas");
  const fileName = readRequiredString(formData, "fileName", "Filnamn saknas");
  const storagePath = readRequiredString(formData, "storagePath", "Sökväg saknas");
  const mimeType = readMimeType(formData);
  const size = readFileSize(formData);

  await requirePieceInGroup(pieceId, groupId);

  const expectedPrefix = `groups/${groupId}/pieces/${pieceId}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    throw new Error("Ogiltig filsökväg");
  }

  const displayName = readOptionalString(formData, "displayName") ?? fileName;

  await prisma.file.create({
    data: {
      pieceId,
      displayName,
      fileName,
      storagePath,
      mimeType,
      size,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidatePath(`/app/${groupSlug}`);
}

export async function createPieceFileDownloadUrl(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const fileId = readIdField(formData, "fileId", "Fil saknas");

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

export async function deletePieceFile(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const fileId = readIdField(formData, "fileId", "Fil saknas");

  const file = await requireFileInGroup(fileId, groupId, {
    select: {
      id: true,
      storagePath: true,
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

  revalidatePath(`/app/${groupSlug}`);
}
