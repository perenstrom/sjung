"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DEFAULT_GROUP_ID } from "@/lib/context";
import { requireUser } from "@/lib/auth/require-user";

export async function getPeople() {
  await requireUser();
  return prisma.person.findMany({
    where: { groupId: DEFAULT_GROUP_ID },
    orderBy: { name: "asc" },
  });
}

export async function createPerson(formData: FormData) {
  const user = await requireUser();
  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  await prisma.person.create({
    data: {
      name: name.trim(),
      groupId: DEFAULT_GROUP_ID,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  revalidatePath("/app/people");
}
