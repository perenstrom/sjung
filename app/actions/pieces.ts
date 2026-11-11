"use server";

import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { findInGroup } from "@/lib/find-in-group";
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
import {
  getPieceDetailForGroup,
  getPiecesForGroup,
  getSetListIdsContainingPiece,
  toPieceNoteListItem,
} from "@/lib/pieces/queries";
import { deleteR2ObjectsOrThrow } from "@/lib/pieces/storage-delete";
import {
  pieceNoteListItemSelect,
  type PieceDetail,
  type PieceNoteListItem,
} from "@/lib/pieces/types";
import { revalidatePieceRoutes } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runContentMutation } from "@/lib/tenant-group";

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

export async function createPiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);
  const credits = parsePieceCreditsFromFormData(formData);
  assertNoDuplicateCredits(credits);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
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

    // A new piece is in no set list yet.
    await revalidatePieceRoutes(groupSlug, created.id, []);
  });
}

export async function updatePiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    await prisma.piece.update({
      where: { id: piece.id },
      data: {
        name: name.trim(),
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function addLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const label = parseOptionalLinkLabelFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    await prisma.link.create({
      data: {
        pieceId: piece.id,
        url: parsedUrl.toString(),
        label,
        createdById: userId,
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function removeLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const linkId = parseLinkIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const link = await findInGroup(groupId, "link", linkId, {
      select: { id: true, pieceId: true },
    });
    await prisma.link.delete({
      where: { id: link.id },
    });

    await revalidatePieceRoutes(groupSlug, link.pieceId);
  });
}

export async function updateLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const linkId = parseLinkIdFromFormData(formData);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const label = parseOptionalLinkLabelFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const link = await findInGroup(groupId, "link", linkId, {
      select: { id: true, pieceId: true },
    });
    await prisma.link.update({
      where: { id: link.id },
      data: {
        url: parsedUrl.toString(),
        label,
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, link.pieceId);
  });
}

export async function addCredit(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const personId = parseCreditPersonIdFromFormData(formData);
  const role = parseCreditRoleFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
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

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function removeCredit(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const personId = parseCreditPersonIdFromFormData(formData);
  const role = parseCreditRoleFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
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

    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function listPieceNotes(
  groupSlug: string,
  pieceId: string
): Promise<PieceNoteListItem[]> {
  const slug = parseWritableGroupSlugParam(groupSlug);
  const { groupId } = await getWritableGroupIdForSlug(slug);
  const piece = await findInGroup(groupId, "piece", parsePieceIdParam(pieceId));

  const notes = await prisma.pieceNote.findMany({
    where: { pieceId: piece.id, groupId },
    orderBy: { updatedAt: "desc" },
    select: pieceNoteListItemSelect,
  });

  return notes.map(toPieceNoteListItem);
}

// createPieceNote/updatePieceNote/deletePieceNote intentionally skip revalidatePieceRoutes:
// revalidating the current route here resets client-side note state (the pieces table's
// notes dialog) on every mutation. Callers refresh their own list via listPieceNotes
// instead. The piece detail page does select notes server-side (pieceDetailSelect), but
// it's dynamically rendered, so navigating to it still fetches fresh notes.
export async function createPieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const content = parsePieceNoteContentFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    await prisma.pieceNote.create({
      data: {
        content,
        pieceId: piece.id,
        groupId,
        createdById: userId,
        updatedById: userId,
      },
    });
  });
}

export async function updatePieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceNoteId = parsePieceNoteIdFromFormData(formData);
  const content = parsePieceNoteContentFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const note = await findInGroup(groupId, "pieceNote", pieceNoteId);
    await prisma.pieceNote.update({
      where: { id: note.id },
      data: {
        content,
        updatedById: userId,
      },
    });
  });
}

export async function deletePieceNote(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceNoteId = parsePieceNoteIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const note = await findInGroup(groupId, "pieceNote", pieceNoteId);
    await prisma.pieceNote.delete({
      where: { id: note.id },
    });
  });
}

export async function deletePiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId, {
      select: { id: true, files: { select: { storagePath: true } } },
    });
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

    // Look up before deleting: the delete cascades to the piece's set list entries.
    const setListIds = await getSetListIdsContainingPiece(piece.id);

    await prisma.piece.delete({
      where: { id: piece.id },
    });

    await revalidatePieceRoutes(groupSlug, piece.id, setListIds);
  });
}
