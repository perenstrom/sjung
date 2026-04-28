"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { readGroupSlugInput, readIdField, readOptionalString, readRequiredString } from "@/lib/actions/input";
import { requireLinkInGroup, requirePieceInGroup } from "@/lib/actions/guards";
import { assertNoDuplicateCredits, diffCredits, parseCreditsFromFormData } from "@/lib/pieces/credits";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

function readGroupSlug(formData: FormData): string {
  return readGroupSlugInput(formData);
}

export async function getPieces(groupSlug: string) {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return prisma.piece.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
    include: {
      credits: {
        include: {
          person: { select: { name: true } },
        },
      },
      files: {
        orderBy: { createdAt: "desc" },
      },
      links: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export type PieceDetail = {
  id: string;
  name: string;
  credits: Array<{
    personId: string;
    role: string;
    person: { name: string };
  }>;
  files: Array<{
    id: string;
    createdAt: Date;
    displayName: string;
    fileName: string;
    mimeType: string;
    size: number;
  }>;
  links: Array<{
    id: string;
    createdAt: Date;
    url: string;
    label: string | null;
  }>;
  setListEntries: Array<{
    id: string;
    setListId: string;
    setListName: string;
  }>;
};

export async function getPieceDetail(
  groupSlug: string,
  pieceId: string
): Promise<PieceDetail | null> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);

  const piece = await prisma.piece.findFirst({
    where: {
      id: pieceId,
      groupId,
    },
    select: {
      id: true,
      name: true,
      credits: {
        select: {
          personId: true,
          role: true,
          person: {
            select: {
              name: true,
            },
          },
        },
      },
      files: {
        select: {
          id: true,
          createdAt: true,
          displayName: true,
          fileName: true,
          mimeType: true,
          size: true,
        },
      },
      links: {
        select: {
          id: true,
          createdAt: true,
          url: true,
          label: true,
        },
      },
      setListEntries: {
        select: {
          id: true,
          setListId: true,
          setList: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!piece) {
    return null;
  }

  return {
    id: piece.id,
    name: piece.name,
    credits: piece.credits.sort((a, b) => {
      const byName = a.person.name.localeCompare(b.person.name, "sv-SE");
      if (byName !== 0) {
        return byName;
      }
      return a.role.localeCompare(b.role, "sv-SE");
    }),
    files: piece.files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    links: piece.links.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    setListEntries: piece.setListEntries
      .map((entry) => ({
        id: entry.id,
        setListId: entry.setListId,
        setListName: entry.setList.name,
      }))
      .sort((a, b) => a.setListName.localeCompare(b.setListName, "sv-SE")),
  };
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

  revalidatePath(`/app/${groupSlug}`);
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

  revalidatePath(`/app/${groupSlug}`);
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

  revalidatePath(`/app/${groupSlug}`);
  revalidatePath(`/app/${groupSlug}/pieces/${piece.id}`);
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

  revalidatePath(`/app/${groupSlug}`);
}

export async function removeLink(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);

  const linkId = readIdField(formData, "linkId", "Länk saknas");

  const link = await requireLinkInGroup(linkId, groupId);

  await prisma.link.delete({
    where: { id: link.id },
  });

  revalidatePath(`/app/${groupSlug}`);
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

  for (const file of piece.files) {
    try {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: file.storagePath,
        })
      );
    } catch {
      throw new Error("Kunde inte ta bort en eller flera filer från lagringen");
    }
  }

  await prisma.piece.delete({
    where: { id: piece.id },
  });

  revalidatePath(`/app/${groupSlug}`);
}
