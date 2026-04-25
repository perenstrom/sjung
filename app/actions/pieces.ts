"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
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

export async function createPiece(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  const creditsJson = formData.get("credits");
  const credits: Credit[] =
    creditsJson && typeof creditsJson === "string"
      ? JSON.parse(creditsJson)
      : [];

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
