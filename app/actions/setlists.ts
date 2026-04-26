"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getWritableGroupIdForSlug } from "@/lib/tenant-group";

type SetListRow = {
  id: string;
  name: string;
  date: Date | null;
  updatedAt: Date;
};

function readGroupSlug(formData: FormData): string {
  const raw = formData.get("groupSlug");
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Saknar grupp");
  }
  return raw.trim();
}

function readSetListId(formData: FormData): string {
  const raw = formData.get("setListId");
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Repertoar saknas");
  }
  return raw.trim();
}

function readName(formData: FormData): string {
  const raw = formData.get("name");
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Namn krävs");
  }
  return raw.trim();
}

function readOptionalDate(formData: FormData): Date | null {
  const raw = formData.get("date");
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ogiltigt datum");
  }

  return parsed;
}

export async function getSetLists(groupSlug: string): Promise<SetListRow[]> {
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  return prisma.setList.findMany({
    where: { groupId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      date: true,
      updatedAt: true,
    },
  });
}

export async function createSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const name = readName(formData);
  const date = readOptionalDate(formData);

  await prisma.setList.create({
    data: {
      name,
      date,
      groupId,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidatePath(`/app/${groupSlug}`);
  revalidatePath(`/app/${groupSlug}/setlists`);
}

export async function updateSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);
  const name = readName(formData);
  const date = readOptionalDate(formData);

  const existing = await prisma.setList.findFirst({
    where: { id: setListId, groupId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Repertoar hittades inte");
  }

  await prisma.setList.update({
    where: { id: existing.id },
    data: {
      name,
      date,
      updatedById: userId,
    },
  });

  revalidatePath(`/app/${groupSlug}`);
  revalidatePath(`/app/${groupSlug}/setlists`);
}

export async function deleteSetList(formData: FormData) {
  const groupSlug = readGroupSlug(formData);
  const { groupId } = await getWritableGroupIdForSlug(groupSlug);
  const setListId = readSetListId(formData);

  const existing = await prisma.setList.findFirst({
    where: { id: setListId, groupId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Repertoar hittades inte");
  }

  await prisma.setList.delete({
    where: { id: existing.id },
  });

  revalidatePath(`/app/${groupSlug}`);
  revalidatePath(`/app/${groupSlug}/setlists`);
}
