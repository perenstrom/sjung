"use server";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { requireFileInGroup, requirePieceInGroup } from "@/lib/actions/guards";
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
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupRoute,
} from "@/lib/revalidate/group-routes";
import { runGroupMutation } from "@/lib/tenant-group";

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 10;
const DOWNLOAD_URL_EXPIRES_SECONDS = 60 * 5;

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, mimeType, size } =
    parseCreatePieceFileUploadFromFormData(formData);

  return runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async ({ groupId }) => {
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
  );
}

export async function finalizePieceFileUpload(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, storagePath, mimeType, size, displayName } =
    parseFinalizePieceFileUploadFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async ({ userId, groupId }) => {
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
  );
}

export async function createPieceFileReplaceUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, mimeType, size } =
    parseCreatePieceFileReplaceUploadFromFormData(formData);

  return runGroupMutation(
    groupSlug,
    ({ groupId }) => requireFileInGroup(fileId, groupId, { select: { pieceId: true } }),
    async ({ groupId }, file) => {
      const safeName = sanitizeFileName(fileName) || "fil";
      const storagePath = `groups/${groupId}/pieces/${file.pieceId}/${randomUUID()}-${safeName}`;
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
  );
}

export async function finalizePieceFileReplace(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, storagePath, mimeType, size } =
    parseFinalizePieceFileReplaceFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireFileInGroup(fileId, groupId, {
        select: { id: true, pieceId: true, storagePath: true },
      }),
    async ({ userId, groupId }, file) => {
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

      revalidateGroupRoute(groupSlug);
      revalidateGroupPieceDetailRoutes(groupSlug, file.pieceId);
    }
  );
}

export async function createPieceFileDownloadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const fileId = parseFileIdFromFormData(formData);

  return runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireFileInGroup(fileId, groupId, {
        select: { storagePath: true, fileName: true, mimeType: true },
      }),
    async (_ctx, file) => {
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
  );
}

export async function updatePieceFileDisplayName(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, displayName } = parseUpdatePieceFileDisplayNameFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireFileInGroup(fileId, groupId, { select: { id: true, pieceId: true } }),
    async ({ userId }, file) => {
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
  );
}

export async function deletePieceFile(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const fileId = parseFileIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requireFileInGroup(fileId, groupId, {
        select: { id: true, storagePath: true, pieceId: true },
      }),
    async (_ctx, file) => {
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
  );
}
