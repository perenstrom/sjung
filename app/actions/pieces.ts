"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { findInGroup } from "@/lib/find-in-group";
import { rankCategories } from "@/lib/pieces/categories";
import { rankCreditRoles, resolveCreditRole } from "@/lib/pieces/credit-roles";
import { isNewAlias } from "@/lib/pieces/aliases";
import { parseCategoryFromFormData } from "@/lib/schemas/categories";
import { assertNoDuplicateCredits, DUPLICATE_CREDITS_ERROR } from "@/lib/pieces/credits";
import {
  parseCreditPersonIdFromFormData,
  parseCreditRolesFromFormData,
  parseLinkIdFromFormData,
  parsePieceAliasIdFromFormData,
  parseOptionalLinkLabelFromFormData,
  parsePieceCreditsFromFormData,
  parsePieceIdFromFormData,
  parsePieceIdParam,
  parsePieceNameFromFormData,
  parsePieceNoteContentFromFormData,
  parsePieceImportFromFormData,
  parsePieceNoteIdFromFormData,
  parseRequiredHttpUrlFromFormData,
} from "@/lib/schemas/pieces";
import {
  parseWritableGroupSlugFromFormData,
  parseWritableGroupSlugParam,
} from "@/lib/schemas/people";
import {
  getCategoriesUsedInGroup,
  getCreditRolesUsedInGroup,
  getPieceDetailForGroup,
  getPieceImportGroupFor,
  getPiecesForGroup,
  getSetListIdsContainingPiece,
  resolveCategoryInGroup,
  toPieceNoteListItem,
} from "@/lib/pieces/queries";
import { deletePieceFiles, STORE_PIECE_SELECT } from "@/lib/pieces/file-store";
import {
  pieceNoteListItemSelect,
  type PieceDetail,
  type PieceNoteListItem,
} from "@/lib/pieces/types";
import {
  buildImportPlan,
  importOutcome,
  MAX_IMPORT_ROWS,
  type ImportGroup,
  type ImportPerson,
  type ImportPreview,
} from "@/lib/pieces/import";
import { revalidateGroupPeopleRoutes, revalidatePieceRoutes } from "@/lib/revalidate/group-routes";
import { getWritableGroupIdForSlug, runContentMutation } from "@/lib/tenant-group";

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

/** The Credit roles to suggest in the Group: the built-in ones, then the Group's own. */
export async function getCreditRoles(groupSlug: string): Promise<string[]> {
  const { groupId } = await getWritableGroupIdForSlug(parseWritableGroupSlugParam(groupSlug));
  return rankCreditRoles(await getCreditRolesUsedInGroup(groupId));
}

/** The Categories to suggest for Files and Links in the Group: the built-in ones, then the Group's own. */
export async function getCategories(groupSlug: string): Promise<string[]> {
  const { groupId } = await getWritableGroupIdForSlug(parseWritableGroupSlugParam(groupSlug));
  return rankCategories(await getCategoriesUsedInGroup(groupId));
}

/** What a Piece import in the Group matches against, for its preview. */
export async function getPieceImportGroup(groupSlug: string): Promise<ImportGroup> {
  const { groupId } = await getWritableGroupIdForSlug(parseWritableGroupSlugParam(groupSlug));
  return getPieceImportGroupFor(groupId);
}

export type PieceImportResult =
  | { kind: "imported"; summary: ImportPreview["counts"] }
  /** The Group changed since the preview: nothing was saved, and this is the Group now. */
  | { kind: "changed"; group: ImportGroup };

/**
 * Confirms a Piece import. Reads the paste again against the Group as it is
 * now and saves nothing if that differs from the outcome the user previewed;
 * otherwise saves every Piece, new Person and Credit in one transaction.
 */
export async function importPieces(formData: FormData): Promise<PieceImportResult> {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { text, choices, outcome } = parsePieceImportFromFormData(formData);

  const result = await runContentMutation(groupSlug, async ({ userId, groupId }): Promise<PieceImportResult> => {
    try {
      return await prisma.$transaction(
        async (tx): Promise<PieceImportResult> => {
          const group = await getPieceImportGroupFor(groupId, tx);
          const plan = buildImportPlan(text, group, choices);
          if (plan.kind === "tooMany") {
            throw new Error(`Högst ${MAX_IMPORT_ROWS} rader kan importeras åt gången`);
          }
          if (plan.kind === "empty") throw new Error(NOTHING_TO_IMPORT);
          if (importOutcome(plan) !== outcome) return { kind: "changed", group };
          if (plan.counts.pieces === 0) throw new Error(NOTHING_TO_IMPORT);

          await saveImport(tx, plan, { groupId, userId });
          return { kind: "imported", summary: plan.counts };
        },
        // Serializable, so a Person or Piece someone adds meanwhile fails the save rather than being duplicated.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 }
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        return { kind: "changed", group: await getPieceImportGroupFor(groupId) };
      }
      throw err;
    }
  });

  // New Pieces are in no Set list and new People only show on these pages.
  if (result.kind === "imported") revalidateGroupPeopleRoutes(groupSlug);
  return result;
}

const NOTHING_TO_IMPORT = "Det finns inga noter att importera";

/** Writes the preview's added Pieces, its new People and their Credits. */
async function saveImport(
  tx: Prisma.TransactionClient,
  plan: ImportPreview,
  { groupId, userId }: { groupId: string; userId: string }
) {
  const pieces = plan.rows.filter((row) => row.add).map((row) => ({ row, id: randomUUID() }));
  const newPersonIds = new Map(plan.newPeople.map((name) => [name, randomUUID()]));
  const personId = (person: ImportPerson) =>
    person.kind === "existing" ? person.id : newPersonIds.get(person.name)!;
  const audit = { createdById: userId, updatedById: userId };

  await tx.person.createMany({
    data: [...newPersonIds].map(([name, id]) => ({ id, name, groupId, ...audit })),
  });
  await tx.piece.createMany({
    data: pieces.map(({ row, id }) => ({ id, name: row.title, groupId, ...audit })),
  });
  await tx.personToPiece.createMany({
    data: pieces.flatMap(({ row, id }) =>
      row.credits.flatMap((credit) =>
        credit.roles.map((role) => ({ pieceId: id, personId: personId(credit.person), role }))
      )
    ),
  });
}

export async function createPiece(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);
  const typedCredits = parsePieceCreditsFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const groupRoles = await getCreditRolesUsedInGroup(groupId);
    const credits = typedCredits.map((c) => ({
      personId: c.personId,
      role: resolveCreditRole(c.role, groupRoles),
    }));
    assertNoDuplicateCredits(credits);
    await Promise.all(credits.map((c) => findInGroup(groupId, "person", c.personId)));
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

/**
 * Gives a Piece another Alias, after its others. An Alias that repeats the
 * Piece's name or one of its Aliases (ignoring case and spacing) is quietly
 * left out.
 */
export async function addPieceAlias(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const name = parsePieceNameFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId, {
      select: { id: true, name: true, aliases: { select: { name: true } } },
    });
    if (!isNewAlias(name, piece)) return;

    await prisma.pieceAlias.create({ data: { pieceId: piece.id, name } });
    await revalidatePieceRoutes(groupSlug, piece.id);
  });
}

export async function removePieceAlias(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceAliasId = parsePieceAliasIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const alias = await findInGroup(groupId, "pieceAlias", pieceAliasId, {
      select: { id: true, pieceId: true },
    });
    await prisma.pieceAlias.delete({ where: { id: alias.id } });

    await revalidatePieceRoutes(groupSlug, alias.pieceId);
  });
}

export async function addLink(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const parsedUrl = parseRequiredHttpUrlFromFormData(formData);
  const label = parseOptionalLinkLabelFromFormData(formData);
  const typedCategory = parseCategoryFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    await prisma.link.create({
      data: {
        pieceId: piece.id,
        url: parsedUrl.toString(),
        label,
        category: await resolveCategoryInGroup(groupId, typedCategory),
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
  const typedCategory = parseCategoryFromFormData(formData);

  await runContentMutation(groupSlug, async ({ userId, groupId }) => {
    const link = await findInGroup(groupId, "link", linkId, {
      select: { id: true, pieceId: true },
    });
    await prisma.link.update({
      where: { id: link.id },
      data: {
        url: parsedUrl.toString(),
        label,
        category: await resolveCategoryInGroup(groupId, typedCategory),
        updatedById: userId,
      },
    });

    await revalidatePieceRoutes(groupSlug, link.pieceId);
  });
}

/** Credits one Person on a saved Piece with every given role, all or none. */
export async function addCredits(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const personId = parseCreditPersonIdFromFormData(formData);
  const typedRoles = parseCreditRolesFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    const person = await findInGroup(groupId, "person", personId);
    const groupRoles = await getCreditRolesUsedInGroup(groupId);
    const credits = typedRoles.map((typed) => ({
      personId: person.id,
      role: resolveCreditRole(typed, groupRoles),
    }));
    assertNoDuplicateCredits(credits);
    try {
      // One INSERT, so a role the Person already holds saves none of them.
      await prisma.personToPiece.createMany({
        data: credits.map((credit) => ({ pieceId: piece.id, ...credit })),
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

/** Removes every Credit a Person has on a saved Piece. */
export async function removePersonCredits(formData: FormData) {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const pieceId = parsePieceIdFromFormData(formData);
  const personId = parseCreditPersonIdFromFormData(formData);

  await runContentMutation(groupSlug, async ({ groupId }) => {
    const piece = await findInGroup(groupId, "piece", pieceId);
    const person = await findInGroup(groupId, "person", personId);
    const { count } = await prisma.personToPiece.deleteMany({
      where: { pieceId: piece.id, personId: person.id },
    });

    if (count === 0) {
      throw new Error("Upphovspersonen finns inte på stycket");
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
// instead, and the pieces list's notes dialog calls router.refresh() once it closes.
// The piece detail page does select notes server-side (pieceDetailSelect), but
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
    const piece = await findInGroup(groupId, "piece", pieceId, { select: STORE_PIECE_SELECT });
    // Look up before deleting: the delete cascades to the piece's set list entries.
    const setListIds = await getSetListIdsContainingPiece(piece.id);

    await prisma.piece.delete({
      where: { id: piece.id },
    });
    await deletePieceFiles(piece);

    await revalidatePieceRoutes(groupSlug, piece.id, setListIds);
  });
}
