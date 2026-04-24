"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DEFAULT_GROUP_ID } from "@/lib/context";
import { requireUser } from "@/lib/auth/require-user";

export async function getSheetMusic() {
  await requireUser();
  return prisma.sheetMusic.findMany({
    where: { groupId: DEFAULT_GROUP_ID },
    orderBy: { name: "asc" },
    include: {
      credits: {
        include: {
          person: { select: { name: true } },
        },
      },
    },
  });
}

type Credit = {
  personId: string;
  role: string;
};

export async function createSheetMusic(formData: FormData) {
  const user = await requireUser();
  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  const creditsJson = formData.get("credits");
  const credits: Credit[] =
    creditsJson && typeof creditsJson === "string"
      ? JSON.parse(creditsJson)
      : [];

  await prisma.sheetMusic.create({
    data: {
      name: name.trim(),
      groupId: DEFAULT_GROUP_ID,
      createdById: user.id,
      updatedById: user.id,
      credits: {
        create: credits.map((c) => ({
          personId: c.personId,
          role: c.role,
        })),
      },
    },
  });

  revalidatePath("/app");
}
