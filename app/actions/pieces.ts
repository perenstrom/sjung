"use server";

import prisma from "@/lib/prisma";
import {
  requireLinkInGroup,
  requirePieceInGroup,
  requirePieceNoteInGroup,
} from "@/lib/actions/guards";
import { assertNoDuplicateCredits, diffCredits } from "@/lib/pieces/credits";
import {
  parseLinkIdFromFormData,
  parseOptionalLinkLabelFromFormData,
  parsePieceCreditsFromFormData,
  parsePieceGroupSlugFromFormData,
  parsePieceIdFromFormData,
  parsePieceIdParam,
  parsePieceNameFromFormData,
  parsePieceNoteContentFromFormData,
  parsePieceNoteIdFromFormData,
  parseRequiredHttpUrlFromFormData,
} from "@/lib/schemas/pieces";
import { parseWritableGroupSlugParam } from "@/lib/schemas/people";
import { getPieceDetailForGroup, getPiecesForGroup } from "@/lib/pieces/queries";
import { deleteR2ObjectsWithConcurrency } from "@/lib/pieces/storage-delete";
import type { PieceDetail } from "@/lib/pieces/types";
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupRoute,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

export type PieceNoteListItem = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
};

const DELETE_PIECE_FAILED_KEYS_LOG_SAMPLE_SIZE = 5;

export async function getPieces(groupSlug: string) {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return getPiecesForGroup(groupId);
}

export async function getPieceDetail(
  groupSlug: string,
  pieceId: string
): Promise<PieceDetail | null> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return getPieceDetailForGroup(groupId, pieceId);
}

/** Minimal title read for navigation; returns null when the piece is missing or inaccessible. */
export async function getPieceTitleForBreadcrumb(
  groupSlug: string,
  pieceId: string
): Promise<{ title: string } | null> {
  try {
    const slug = parseWritableGroupSlugParam(groupSlug);
    const { groupId } = await getWritableGroupIdForSlug(slug);
    const piece = await prisma.piece.findFirst({
      where: { id: pieceId, groupId },
      select: { name: true },
    });
    if (!piece) {
      return null;
    }
    return { title: piece.name };
  } catch {
    return null;
  }
}

async function requirePieceForLinkMutation(formData: FormData, groupId: string) {
  const pieceId = parsePieceIdFromFormData(formData);
  return requirePieceInGroup(pieceId, groupId);
}

async function requireLinkForLinkMutation(formData: FormData, groupId: string) {
  const linkId = parseLinkIdFromFormData(formData);
  return requireLinkInGroup(linkId, groupId, {
    select: { id: true, pieceId: true },
  });
}

export async function createPiece(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = parsePieceNameFromFormData(formData);

  const credits = parsePieceCreditsFromFormData(formData);
  assertNoDuplicateCredits(credits);

  const created = await prisma.piece.create({
    data: {
      name: name.trim(),
      groupId,
      createdById: userId,
      updatedById: userId,
      credits: {
        create: credits.map((c) => ({
          personId: c.personId,
          role: c.role,
        })),
      },
    },
    select: { id: true },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, created.id);
}

export async function updatePiece(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = parsePieceIdFromFormData(formData);

  const name = parsePieceNameFromFormData(formData);

  const credits = parsePieceCreditsFromFormData(formData);
  assertNoDuplicateCredits(credits);

  const piece = await requirePieceInGroup(pieceId, groupId, {
    select: {
      id: true,
      credits: {
        select: {
          personId: true,
          role: true,
        },
      },
    },
  });

  const { creditsToCreate, creditsToDelete } = diffCredits(piece.credits, credits);

  await prisma.$transaction(async (tx) => {
    if (creditsToDelete.length > 0) {
      await tx.personToPiece.deleteMany({
        where: {
          pieceId: piece.id,
          OR: creditsToDelete.map((credit) => ({
            personId: credit.personId,
            role: credit.role,
          })),
        },
      });
    }

    if (creditsToCreate.length > 0) {
      await tx.personToPiece.createMany({
        data: creditsToCreate.map((credit) => ({
          pieceId: piece.id,
          personId: credit.personId,
          role: credit.role,
        })),
      });
    }

    await tx.piece.update({
      where: { id: piece.id },
      data: {
        name: name.trim(),
        updatedById: userId,
      },
    });
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
}

export async function updatePieceMetadata(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = parsePieceIdFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);

  const piece = await requirePieceInGroup(pieceId, groupId);

  await prisma.piece.update({
    where: { id: piece.id },
    data: {
      name: name.trim(),
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
}

export async function addLink(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const piece = await requirePieceForLinkMutation(formData, groupId);

  const label = parseOptionalLinkLabelFromFormData(formData);

  await prisma.link.create({
    data: {
      pieceId: piece.id,
      url: parsedUrl.toString(),
      label,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
}

export async function removeLink(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const link = await requireLinkForLinkMutation(formData, groupId);

  await prisma.link.delete({
    where: { id: link.id },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, link.pieceId);
}

export async function updateLink(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const link = await requireLinkForLinkMutation(formData, groupId);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const label = parseOptionalLinkLabelFromFormData(formData);

  await prisma.link.update({
    where: { id: link.id },
    data: {
      url: parsedUrl.toString(),
      label,
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, link.pieceId);
}

export async function listPieceNotes(
  groupSlug: string,
  pieceId: string
): Promise<PieceNoteListItem[]> {
  const slug = parseWritableGroupSlugParam(groupSlug);
  const { groupId } = await getWritableGroupIdForSlug(slug);
  const parsedPieceId = parsePieceIdParam(pieceId);
  await requirePieceInGroup(parsedPieceId, groupId);

  return prisma.pieceNote.findMany({
    where: { pieceId: parsedPieceId, groupId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      updatedById: true,
    },
  });
}

export async function createPieceNote(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = parsePieceIdFromFormData(formData);
  const content = parsePieceNoteContentFromFormData(formData);

  const piece = await requirePieceInGroup(pieceId, groupId);

  await prisma.pieceNote.create({
    data: {
      content,
      pieceId: piece.id,
      groupId,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
}

export async function updatePieceNote(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceNoteId = parsePieceNoteIdFromFormData(formData);
  const content = parsePieceNoteContentFromFormData(formData);

  const note = await requirePieceNoteInGroup(pieceNoteId, groupId);

  await prisma.pieceNote.update({
    where: { id: note.id },
    data: {
      content,
      updatedById: userId,
    },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, note.pieceId);
}

export async function deletePieceNote(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceNoteId = parsePieceNoteIdFromFormData(formData);

  const note = await requirePieceNoteInGroup(pieceNoteId, groupId);

  await prisma.pieceNote.delete({
    where: { id: note.id },
  });

  revalidateGroupRoute(groupSlug);
  revalidateGroupPieceDetailRoutes(groupSlug, note.pieceId);
}

export async function deletePiece(formData: FormData) {
  const groupSlug = parsePieceGroupSlugFromFormData(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = parsePieceIdFromFormData(formData);

  const piece = await requirePieceInGroup(pieceId, groupId, {
    select: {
      id: true,
      files: {
        select: {
          storagePath: true,
        },
      },
    },
  });

  const deletionResult = await deleteR2ObjectsWithConcurrency(
    piece.files.map((file) => file.storagePath),
    5
  );
  if (deletionResult.failedCount > 0) {
    const failedKeySample = deletionResult.failedKeys.slice(0, DELETE_PIECE_FAILED_KEYS_LOG_SAMPLE_SIZE);
    console.error("deletePiece failed to remove one or more R2 objects", {
      pieceId: piece.id,
      failedCount: deletionResult.failedCount,
      totalCount: deletionResult.totalCount,
      failedKeysSample: failedKeySample,
    });
    throw new Error("Kunde inte ta bort en eller flera filer från lagringen");
  }

  await prisma.piece.delete({
    where: { id: piece.id },
  });

  revalidateGroupRoute(groupSlug);
}
