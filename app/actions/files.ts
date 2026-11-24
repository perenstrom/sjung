"use server";

import { after } from "next/server";

import { freeContentSlug } from "@/lib/content-slug";
import { findInGroup } from "@/lib/find-in-group";
import * as fileStore from "@/lib/pieces/file-store";
import prisma from "@/lib/prisma";
import { resolveCategoryInGroup } from "@/lib/pieces/queries";
import { parseCategoryFromFormData } from "@/lib/schemas/categories";
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
import { runContentMutation } from "@/lib/tenant-group";

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, mimeType, size } = parseCreatePieceFileUploadFromFormData(formData);

  return runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId, { select: fileStore.STORE_PIECE_SELECT });
    return fileStore.signUpload(piece, { fileName, mimeType, size });
  });
}

export async function finalizePieceFileUpload(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, storagePath, displayName } = parseFinalizePieceFileUploadFromFormData(formData);
  const typedCategory = parseCategoryFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId, { select: fileStore.STORE_PIECE_SELECT });
    const file = await fileStore.addFile(
      piece,
      { storagePath, fileName },
      {
        displayName: displayName ?? fileName,
        category: await resolveCategoryInGroup(groupId, typedCategory),
        userId,
      },
    );
    convertAfterResponse(file);

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function createPieceFileReplaceUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, mimeType, size } = parseCreatePieceFileReplaceUploadFromFormData(formData);

  return runContentMutation(groupSlug, async ({ groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, { select: fileStore.STORE_FILE_SELECT });
    return fileStore.signUpload(file.piece, { fileName, mimeType, size });
  });
}

export async function finalizePieceFileReplace(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, storagePath } = parseFinalizePieceFileReplaceFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, { select: fileStore.STORE_FILE_SELECT });
    convertAfterResponse(await fileStore.replaceFile(file, { storagePath, fileName }, userId));

    await revalidatePieceRoutes(groupSlug, file.piece.id);
  });
}

export async function updatePieceFileDisplayName(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, displayName } = parseUpdatePieceFileDisplayNameFromFormData(formData);
  const typedCategory = parseCategoryFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, {
      select: { id: true, pieceId: true },
    });
    await prisma.file.update({
      where: { id: file.id },
      data: {
        displayName,
        slug: await freeContentSlug(prisma, "file", groupId, displayName, file.id),
        category: await resolveCategoryInGroup(groupId, typedCategory),
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
    const file = await findInGroup(groupId, "file", fileId, { select: fileStore.STORE_FILE_SELECT });
    await fileStore.deleteFile(file);

    await revalidatePieceRoutes(groupSlug, file.piece.id);
  });
}

/**
 * Prepares a MuseScore File for the player again, after it failed or was left
 * pending by a restart (ADR-0009). Needs Manage content, like any change to a File.
 */
export async function retryPieceFileConversion(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const fileId = parseFileIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const file = await findInGroup(groupId, "file", fileId, { select: { id: true, pieceId: true } });
    convertAfterResponse(await fileStore.retryConversion(file));

    await revalidatePieceRoutes(groupSlug, file.pieceId);
  });
}

/**
 * Converts a MuseScore File for the player after the response is sent, so
 * the upload doesn't wait for the worker (ADR-0009). No queue: a File left
 * pending by a restart is retried by hand, with `retryPieceFileConversion`.
 */
function convertAfterResponse(file: fileStore.SavedFile) {
  if (file.pendingConversion) {
    after(() => fileStore.convertFile(file.id));
  }
}
