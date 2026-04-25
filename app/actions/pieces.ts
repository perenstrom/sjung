"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

function readGroupSlug(formData: FormData): string {
  const raw = formData.get("groupSlug");
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Saknar grupp");
  }
  return raw.trim();
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

type Credit = {
  personId: string;
  role: string;
};

function readPieceId(formData: FormData): string {
  const pieceId = formData.get("pieceId");
  if (!pieceId || typeof pieceId !== "string" || pieceId.trim() === "") {
    throw new Error("Stycke saknas");
  }
  return pieceId.trim();
}

function parseCredits(formData: FormData): Credit[] {
  const creditsJson = formData.get("credits");
  if (!creditsJson) {
    return [];
  }
  if (typeof creditsJson !== "string") {
    throw new Error("Ogiltigt format för medverkande");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(creditsJson);
  } catch {
    throw new Error("Ogiltigt format för medverkande");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Ogiltigt format för medverkande");
  }

  return parsed.map((item) => {
    const candidate = item as Record<string, unknown>;
    if (
      !item ||
      typeof item !== "object" ||
      typeof candidate.personId !== "string" ||
      candidate.personId.trim() === "" ||
      typeof candidate.role !== "string" ||
      candidate.role.trim() === ""
    ) {
      throw new Error("Ogiltigt format för medverkande");
    }
    return { personId: candidate.personId.trim(), role: candidate.role.trim() };
  });
}

function assertNoDuplicateCredits(credits: Credit[]) {
  const seen = new Set<string>();
  for (const credit of credits) {
    const key = `${credit.personId}::${credit.role}`;
    if (seen.has(key)) {
      throw new Error("En person kan inte ha samma roll flera gånger");
    }
    seen.add(key);
  }
}

export async function createPiece(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  const credits = parseCredits(formData);
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

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  const credits = parseCredits(formData);
  assertNoDuplicateCredits(credits);

  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, groupId },
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

  if (!piece) {
    throw new Error("Stycke hittades inte");
  }

  const nextKeys = new Set(credits.map((credit) => `${credit.personId}::${credit.role}`));
  const currentKeys = new Set(
    piece.credits.map((credit) => `${credit.personId}::${credit.role}`)
  );

  const creditsToCreate = credits.filter(
    (credit) => !currentKeys.has(`${credit.personId}::${credit.role}`)
  );
  const creditsToDelete = piece.credits.filter(
    (credit) => !nextKeys.has(`${credit.personId}::${credit.role}`)
  );

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

export async function addLink(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const pieceId = formData.get("pieceId");
  if (!pieceId || typeof pieceId !== "string" || pieceId.trim() === "") {
    throw new Error("Stycke saknas");
  }

  const urlRaw = formData.get("url");
  if (!urlRaw || typeof urlRaw !== "string" || urlRaw.trim() === "") {
    throw new Error("Länk krävs");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlRaw.trim());
  } catch {
    throw new Error("Ogiltig länk");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Länk måste börja med http eller https");
  }

  const piece = await prisma.piece.findFirst({
    where: { id: pieceId.trim(), groupId },
    select: { id: true },
  });

  if (!piece) {
    throw new Error("Stycke hittades inte");
  }

  const labelRaw = formData.get("label");
  const label =
    typeof labelRaw === "string" && labelRaw.trim() !== ""
      ? labelRaw.trim()
      : null;

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

  const linkId = formData.get("linkId");
  if (!linkId || typeof linkId !== "string" || linkId.trim() === "") {
    throw new Error("Länk saknas");
  }

  const link = await prisma.link.findFirst({
    where: {
      id: linkId.trim(),
      piece: {
        groupId,
      },
    },
    select: { id: true },
  });

  if (!link) {
    throw new Error("Länk hittades inte");
  }

  await prisma.link.delete({
    where: { id: link.id },
  });

  revalidatePath(`/app/${groupSlug}`);
}

export async function deletePiece(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const pieceId = readPieceId(formData);

  const piece = await prisma.piece.findFirst({
    where: {
      id: pieceId,
      groupId,
    },
    select: {
      id: true,
      files: {
        select: {
          storagePath: true,
        },
      },
    },
  });

  if (!piece) {
    throw new Error("Stycke hittades inte");
  }

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
