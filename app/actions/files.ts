"use server";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getR2Bucket, getR2Client, sanitizeFileName } from "@/lib/r2";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function readString(formData: FormData, field: string, errorMessage: string): string {
  const value = formData.get(field);
  if (!value || typeof value !== "string" || value.trim() === "") {
    throw new Error(errorMessage);
  }
  return value.trim();
}

function readGroupSlug(formData: FormData): string {
  return readString(formData, "groupSlug", "Saknar grupp");
}

function readFileSize(formData: FormData): number {
  const value = Number(readString(formData, "size", "Filstorlek saknas"));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Ogiltig filstorlek");
  }
  if (value > MAX_FILE_SIZE_BYTES) {
    throw new Error("Filen är för stor (max 50 MB)");
  }
  return value;
}

function readMimeType(formData: FormData): string {
  const mimeType = readString(formData, "mimeType", "Filtyp saknas");
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Filtypen stöds inte");
  }
  return mimeType;
}

async function assertPieceAccess(pieceId: string, groupId: string) {
  const piece = await prisma.piece.findFirst({
    where: {
      id: pieceId,
      groupId,
    },
    select: { id: true },
  });

  if (!piece) {
    throw new Error("Stycke hittades inte");
  }
}

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readString(formData, "pieceId", "Stycke saknas");
  const fileName = readString(formData, "fileName", "Filnamn saknas");
  const mimeType = readMimeType(formData);
  const size = readFileSize(formData);

  await assertPieceAccess(pieceId, groupId);

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
  const pieceId = readString(formData, "pieceId", "Stycke saknas");
  const fileName = readString(formData, "fileName", "Filnamn saknas");
  const storagePath = readString(formData, "storagePath", "Sökväg saknas");
  const mimeType = readMimeType(formData);
  const size = readFileSize(formData);
  const displayNameRaw = formData.get("displayName");

  await assertPieceAccess(pieceId, groupId);

  const expectedPrefix = `groups/${groupId}/pieces/${pieceId}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    throw new Error("Ogiltig filsökväg");
  }

  const displayName =
    typeof displayNameRaw === "string" && displayNameRaw.trim() !== ""
      ? displayNameRaw.trim()
      : fileName;

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

export async function deletePieceFile(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const fileId = readString(formData, "fileId", "Fil saknas");

  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      piece: { groupId },
    },
    select: {
      id: true,
      storagePath: true,
    },
  });

  if (!file) {
    throw new Error("Fil hittades inte");
  }

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
