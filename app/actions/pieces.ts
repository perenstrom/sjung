"use server";

import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  noGuard,
  requireLinkInGroup,
  requirePieceInGroup,
  requirePieceNoteInGroup,
} from "@/lib/actions/guards";
import { assertNoDuplicateCredits, DUPLICATE_CREDITS_ERROR } from "@/lib/pieces/credits";
import {
  parseCreditPersonIdFromFormData,
  parseCreditRoleFromFormData,
  parseLinkIdFromFormData,
  parseOptionalLinkLabelFromFormData,
  parsePieceCreditsFromFormData,
  parsePieceIdFromFormData,
  parsePieceIdParam,
  parsePieceNameFromFormData,
  parsePieceNoteContentFromFormData,
  parsePieceNoteIdFromFormData,
  parseRequiredHttpUrlFromFormData,
} from "@/lib/schemas/pieces";
import {
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";
import { getPieceDetailForGroup, getPiecesForGroup } from "@/lib/pieces/queries";
import { deleteR2ObjectsOrThrow } from "@/lib/pieces/storage-delete";
import type { PieceDetail } from "@/lib/pieces/types";
import {
  revalidateGroupPieceDetailRoutes,
  revalidateGroupRoute,
} from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runGroupMutation } from "@/lib/tenant-group";

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

export async function createPiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);
  const credits = parsePieceCreditsFromFormData(formData);
  assertNoDuplicateCredits(credits);

  await runGroupMutation(groupSlug, noGuard, async ({ userId, groupId }) => {
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
  });
}

export async function updatePiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async ({ userId }, piece) => {
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
  );
}

export async function updatePieceMetadata(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async ({ userId }, piece) => {
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
  );
}

export async function addLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const label = parseOptionalLinkLabelFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async ({ userId }, piece) => {
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
  );
}

export async function removeLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const linkId = parseLinkIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requireLinkInGroup(linkId, groupId, { select: { id: true, pieceId: true } }),
    async (_ctx, link) => {
      await prisma.link.delete({
        where: { id: link.id },
      });

      revalidateGroupRoute(groupSlug);
      revalidateGroupPieceDetailRoutes(groupSlug, link.pieceId);
    }
  );
}

export async function updateLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const linkId = parseLinkIdFromFormData(formData);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const label = parseOptionalLinkLabelFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requireLinkInGroup(linkId, groupId, { select: { id: true, pieceId: true } }),
    async ({ userId }, link) => {
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
  );
}

export async function addCredit(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const personId = parseCreditPersonIdFromFormData(formData);
  const role = parseCreditRoleFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async (_ctx, piece) => {
      try {
        await prisma.personToPiece.create({
          data: {
            pieceId: piece.id,
            personId,
            role,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new Error(DUPLICATE_CREDITS_ERROR);
        }
        throw err;
      }

      revalidateGroupRoute(groupSlug);
      revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
    }
  );
}

export async function removeCredit(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const personId = parseCreditPersonIdFromFormData(formData);
  const role = parseCreditRoleFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async (_ctx, piece) => {
      const { count } = await prisma.personToPiece.deleteMany({
        where: {
          pieceId: piece.id,
          personId,
          role,
        },
      });

      if (count === 0) {
        throw new Error("Medverkande hittades inte");
      }

      revalidateGroupRoute(groupSlug);
      revalidateGroupPieceDetailRoutes(groupSlug, piece.id);
    }
  );
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
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const content = parsePieceNoteContentFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceInGroup(pieceId, groupId),
    async ({ userId, groupId }, piece) => {
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
  );
}

export async function updatePieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceNoteId = parsePieceNoteIdFromFormData(formData);
  const content = parsePieceNoteContentFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceNoteInGroup(pieceNoteId, groupId),
    async ({ userId }, note) => {
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
  );
}

export async function deletePieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceNoteId = parsePieceNoteIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) => requirePieceNoteInGroup(pieceNoteId, groupId),
    async (_ctx, note) => {
      await prisma.pieceNote.delete({
        where: { id: note.id },
      });

      revalidateGroupRoute(groupSlug);
      revalidateGroupPieceDetailRoutes(groupSlug, note.pieceId);
    }
  );
}

export async function deletePiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);

  await runGroupMutation(
    groupSlug,
    ({ groupId }) =>
      requirePieceInGroup(pieceId, groupId, {
        select: {
          id: true,
          files: {
            select: {
              storagePath: true,
            },
          },
        },
      }),
    async (_ctx, piece) => {
      await deleteR2ObjectsOrThrow(
        piece.files.map((file) => file.storagePath),
        "Kunde inte ta bort en eller flera filer från lagringen",
        {
          concurrency: 5,
          onFailure: (result) => {
            const failedKeySample = result.failedKeys.slice(
              0,
              DELETE_PIECE_FAILED_KEYS_LOG_SAMPLE_SIZE
            );
            console.error("deletePiece failed to remove one or more R2 objects", {
              pieceId: piece.id,
              failedCount: result.failedCount,
              totalCount: result.totalCount,
              failedKeysSample: failedKeySample,
            });
          },
        }
      );

      await prisma.piece.delete({
        where: { id: piece.id },
      });

      revalidateGroupRoute(groupSlug);
    }
  );
}
