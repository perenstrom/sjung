"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export async function getGroups() {
  const user = await requireUser();
  const groups = await prisma.group.findMany({
    where: {
      users: {
        some: { userId: user.id },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdById: true,
    },
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    isCreator: g.createdById === user.id,
  }));
}

export async function createGroup(formData: FormData) {
  const user = await requireUser();
  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Gruppnamn krävs");
  }

  await prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: name.trim(),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await tx.usersToGroups.create({
      data: {
        userId: user.id,
        groupId: group.id,
      },
    });
  });

  revalidatePath("/app/groups");
}

export async function updateGroup(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  const name = formData.get("name");

  if (!id || typeof id !== "string") {
    throw new Error("Ogiltig grupp");
  }
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Gruppnamn krävs");
  }

  const existing = await prisma.group.findFirst({
    where: { id, createdById: user.id },
  });
  if (!existing) {
    throw new Error("Du har inte behörighet att redigera den här gruppen");
  }

  await prisma.group.update({
    where: { id },
    data: {
      name: name.trim(),
      updatedById: user.id,
    },
  });

  revalidatePath("/app/groups");
}

export async function deleteGroup(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    throw new Error("Ogiltig grupp");
  }

  const existing = await prisma.group.findFirst({
    where: { id, createdById: user.id },
  });
  if (!existing) {
    throw new Error("Du har inte behörighet att ta bort den här gruppen");
  }

  await prisma.group.delete({
    where: { id },
  });

  revalidatePath("/app/groups");
}
