"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DEFAULT_GROUP_ID, SYSTEM_USER_ID } from "@/lib/context";

export async function getPeople() {
  return prisma.person.findMany({
    where: { groupId: DEFAULT_GROUP_ID },
    orderBy: { name: "asc" },
  });
}

export async function createPerson(formData: FormData) {
  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  await prisma.person.create({
    data: {
      name: name.trim(),
      groupId: DEFAULT_GROUP_ID,
      createdById: SYSTEM_USER_ID,
      updatedById: SYSTEM_USER_ID,
    },
  });

  revalidatePath("/people");
}
