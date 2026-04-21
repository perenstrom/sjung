"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DEFAULT_GROUP_ID, SYSTEM_USER_ID } from "@/lib/context";

export async function getSheetMusic() {
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
      createdById: SYSTEM_USER_ID,
      updatedById: SYSTEM_USER_ID,
      credits: {
        create: credits.map((c) => ({
          personId: c.personId,
          role: c.role,
        })),
      },
    },
  });

  revalidatePath("/");
}
