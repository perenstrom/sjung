"use server";

import prisma from "@/lib/prisma";
import { readGroupSlugInput, readIdField, readOptionalString, readRequiredString } from "@/lib/actions/input";
import { requireLinkInGroup, requirePieceInGroup } from "@/lib/actions/guards";
import { assertNoDuplicateCredits, diffCredits, parseCreditsFromFormData } from "@/lib/pieces/credits";
import { getPieceDetailForGroup, getPiecesForGroup } from "@/lib/pieces/queries";
import { deleteR2ObjectsWithConcurrency } from "@/lib/pieces/storage-delete";
import type { PieceDetail } from "@/lib/pieces/types";
import { revalidateGroupPieceDetailRoutes, revalidateGroupRoute } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

function readGroupSlug(formData: FormData): string {
  return readGroupSlugInput(formData);
}

export async function getPieces(groupSlug: string) {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return getPiecesForGroup(groupId);
}

export type { PieceDetail };

export async function getPieceDetail(
  groupSlug: string,
  pieceId: string
): Promise<PieceDetail | null> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return getPieceDetailForGroup(groupId, pieceId);
}

function readPieceId(formData: FormData): string {
  return readIdField(formData, "pieceId", "Stycke saknas");
}

export async function createPiece(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = readRequiredString(formData, "name", "Namn krävs");

  const credits = parseCreditsFromFormData(formData);
  assertNoDuplicateCredits(credits);

  await prisma.piece.create({
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
  });

  revalidateGroupRoute(groupSlug);
}

export async function updatePiece(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readPieceId(formData);

  const name = readRequiredString(formData, "name", "Namn krävs");

  const credits = parseCreditsFromFormData(formData);
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
}

export async function updatePieceMetadata(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readPieceId(formData);
  const name = readRequiredString(formData, "name", "Namn krävs");

  const piece = await requirePieceInGroup(pieceId, groupId);

  await prisma.piece.update({
    where: { id: piece.id },
    data: {
      name: name.trim(),
      updatedById: userId,
    },
  });

  revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
}

export async function addLink(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const pieceId = readIdField(formData, "pieceId", "Stycke saknas");

  const urlRaw = readRequiredString(formData, "url", "Länk krävs");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlRaw.trim());
  } catch {
    throw new Error("Ogiltig länk");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Länk måste börja med http eller https");
  }

  const piece = await requirePieceInGroup(pieceId, groupId);

  const label = readOptionalString(formData, "label");

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
}

export async function removeLink(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);

  const linkId = readIdField(formData, "linkId", "Länk saknas");

  const link = await requireLinkInGroup(linkId, groupId);

  await prisma.link.delete({
    where: { id: link.id },
  });

  revalidateGroupRoute(groupSlug);
}

export async function deletePiece(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readPieceId(formData);

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
    console.error("deletePiece failed to remove one or more R2 objects", {
      pieceId: piece.id,
      failedCount: deletionResult.failedCount,
      totalCount: deletionResult.totalCount,
    });
    throw new Error("Kunde inte ta bort en eller flera filer från lagringen");
  }

  await prisma.piece.delete({
    where: { id: piece.id },
  });

  revalidateGroupRoute(groupSlug);
}
