"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import * as announcementStore from "@/lib/announcements/announcements";
import type {
  AnnouncementDetail,
  AnnouncementListItem,
  ManagedAnnouncement,
} from "@/lib/announcements/announcements";
import { isOperator } from "@/lib/operators/operators";
import { requireOperator, requireOperatorPage } from "@/lib/operators/require-operator";
import { MANAGE_ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";
import { requireUser, type SessionUser } from "@/lib/auth/require-user";
import prisma from "@/lib/prisma";
import { parseAnnouncementForm, type AnnouncementForm } from "@/lib/schemas/announcements";
import { formDataString } from "@/lib/schemas/form-data";

export type AnnouncementsInbox = {
  announcements: AnnouncementListItem[];
  unreadCount: number;
  /** Whether the User is an Operator, so the list links to Hantera nyheter. */
  canManage: boolean;
};

/** The signed-in User's Announcements, newest first. Listing marks nothing read. */
export async function getAnnouncementsInbox(): Promise<AnnouncementsInbox> {
  const user = await requireUser();
  const announcements = await announcementStore.listAnnouncements(user);
  return {
    announcements,
    unreadCount: announcements.filter(({ read }) => !read).length,
    canManage: isOperator(user),
  };
}

/** One Announcement to read, or null if it doesn't exist. Reading it is marked separately. */
export async function getAnnouncement(id: string): Promise<AnnouncementDetail | null> {
  await requireUser();
  return announcementStore.findAnnouncement(id);
}

/**
 * Every app page shows whether unread Announcements exist (the sidebar dot),
 * so a change to read state or to the Announcements refreshes the whole app.
 */
function revalidateAnnouncements() {
  revalidatePath("/app", "layout");
}

/** Marks an Announcement read for the signed-in User, on opening it. */
export async function markAnnouncementRead(id: string): Promise<void> {
  const user = await requireUser();
  await announcementStore.markAnnouncementRead(user, id);
  revalidateAnnouncements();
}

/** "Markera alla som lästa", for the signed-in User. */
export async function markAllAnnouncementsRead(): Promise<void> {
  const user = await requireUser();
  await announcementStore.markAllAnnouncementsRead(user);
  revalidateAnnouncements();
}

/** Hantera nyheter: every Announcement, newest first. Not found for anyone but an Operator. */
export async function getAnnouncementsToManage(): Promise<ManagedAnnouncement[]> {
  await requireOperatorPage();
  return announcementStore.listAnnouncementsToManage();
}

/** The Announcement an Operator is editing. Not found for anyone else, or if it doesn't exist. */
export async function getAnnouncementToEdit(id: string): Promise<AnnouncementDetail> {
  await requireOperatorPage();
  const announcement = await announcementStore.findAnnouncement(id);
  if (!announcement) {
    notFound();
  }
  return announcement;
}

/** `useActionState` state for the Announcement editor: why saving failed, and what was typed. */
export type AnnouncementFormState = { error: string; values: AnnouncementForm } | null;

/**
 * The editor's save: as an Operator, with a valid form, run `write`, then go
 * back to Hantera nyheter. `write` answers with an error message if it can't.
 */
async function saveAnnouncement(
  formData: FormData,
  write: (operator: SessionUser, form: AnnouncementForm) => Promise<string | null>
): Promise<AnnouncementFormState> {
  const operator = await requireOperator();
  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error, values: parsed.values };
  }

  const error = await write(operator, parsed.data);
  if (error) {
    return { error, values: parsed.data };
  }
  revalidateAnnouncements();
  redirect(MANAGE_ANNOUNCEMENTS_PATH);
}

/** Publishes a new Announcement at once, to every Verified user. */
export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  return saveAnnouncement(formData, async (operator, form) => {
    await prisma.announcement.create({
      // The author has read what they wrote, so it doesn't show as unread to them.
      data: {
        ...form,
        createdById: operator.id,
        updatedById: operator.id,
        reads: { create: { userId: operator.id } },
      },
    });
    return null;
  });
}

/** Saves changes to an Announcement. Those who have read it keep it read. */
export async function updateAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  return saveAnnouncement(formData, async (operator, form) => {
    const { count } = await prisma.announcement.updateMany({
      where: { id: formDataString(formData, "id") },
      data: { ...form, updatedById: operator.id },
    });
    return count === 0 ? "Nyheten finns inte längre" : null;
  });
}

/** Deletes an Announcement for everyone, along with its read state. */
export async function deleteAnnouncement(formData: FormData): Promise<void> {
  await requireOperator();
  await prisma.announcement.deleteMany({ where: { id: formDataString(formData, "id") } });
  revalidateAnnouncements();
}
