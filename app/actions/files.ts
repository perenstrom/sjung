"use server";

import { findInGroup } from "@/lib/find-in-group";
import * as fileStore from "@/lib/pieces/file-store";
import prisma from "@/lib/prisma";
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

export async function createPieceFileUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, mimeType, size } =
    parseCreatePieceFileUploadFromFormData(formData);

  return runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId, { select: fileStore.STORE_PIECE_SELECT });
    return fileStore.signUpload(piece, { fileName, mimeType, size });
  });
}

export async function finalizePieceFileUpload(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { pieceId, fileName, storagePath, displayName } =
    parseFinalizePieceFileUploadFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId, { select: fileStore.STORE_PIECE_SELECT });
    await fileStore.addFile(
      piece,
      { storagePath, fileName },
      { displayName: displayName ?? fileName, userId }
    );

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function createPieceFileReplaceUploadUrl(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { fileId, fileName, mimeType, size } =
    parseCreatePieceFileReplaceUploadFromFormData(formData);

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
    await fileStore.replaceFile(file, { storagePath, fileName }, userId);

    await revalidatePieceRoutes(groupSlug, file.piece.id);
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

  return { downloadUrl: await fileStore.signDownload(file) };
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
    const file = await findInGroup(groupId, "file", fileId, { select: fileStore.STORE_FILE_SELECT });
    await fileStore.deleteFile(file);

    await revalidatePieceRoutes(groupSlug, file.piece.id);
  });
}
