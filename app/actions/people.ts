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

export async function getPeople(groupSlug: string) {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
  });
}

export async function createPerson(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Namn krävs");
  }

  await prisma.person.create({
    data: {
      name: name.trim(),
      groupId,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidatePath(`/app/${groupSlug}`);
  revalidatePath(`/app/${groupSlug}/people`);
}
