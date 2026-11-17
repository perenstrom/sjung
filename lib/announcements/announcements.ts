import prisma from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Who is reading. An Announcement is read when the User has opened it (or
 * marked all read), or when it was published before their account was
 * created. The latter is worked out from the times, never stored.
 */
export type Reader = { id: string; createdAt: Date };

export type AnnouncementListItem = {
  id: string;
  title: string;
  publishedAt: Date;
  read: boolean;
};

export type AnnouncementDetail = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
};

/** Newest first; the id only keeps the order stable when two share a publish time. */
const NEWEST_FIRST: Prisma.AnnouncementOrderByWithRelationInput[] = [{ publishedAt: "desc" }, { id: "asc" }];

/** Announcements the Reader has not read: published after they joined, with no read row. */
function unreadBy(reader: Reader): Prisma.AnnouncementWhereInput {
  return { publishedAt: { gt: reader.createdAt }, reads: { none: { userId: reader.id } } };
}

/** Whether the Reader has any unread Announcement. Runs on every app page, so it stays one indexed lookup. */
export async function hasUnreadAnnouncements(reader: Reader): Promise<boolean> {
  const unread = await prisma.announcement.findFirst({ where: unreadBy(reader), select: { id: true } });
  return unread !== null;
}

/** Every Announcement, newest first, with whether the Reader has read it. Marks nothing read. */
export async function listAnnouncements(reader: Reader): Promise<AnnouncementListItem[]> {
  const announcements = await prisma.announcement.findMany({
    orderBy: NEWEST_FIRST,
    select: {
      id: true,
      title: true,
      publishedAt: true,
      reads: { where: { userId: reader.id }, select: { userId: true } },
    },
  });
  return announcements.map(({ reads, ...announcement }) => ({
    ...announcement,
    read: announcement.publishedAt <= reader.createdAt || reads.length > 0,
  }));
}

export type ManagedAnnouncement = { id: string; title: string; publishedAt: Date };

/** Every Announcement, newest first, as Hantera nyheter lists them. */
export async function listAnnouncementsToManage(): Promise<ManagedAnnouncement[]> {
  return prisma.announcement.findMany({
    orderBy: NEWEST_FIRST,
    select: { id: true, title: true, publishedAt: true },
  });
}

export async function findAnnouncement(id: string): Promise<AnnouncementDetail | null> {
  return prisma.announcement.findUnique({
    where: { id },
    select: { id: true, title: true, body: true, publishedAt: true },
  });
}

/** Marks one Announcement read for the Reader. Does nothing if it is already read or doesn't exist. */
export async function markAnnouncementRead(reader: Reader, announcementId: string): Promise<void> {
  await markRead(reader, { id: announcementId });
}

/** Marks every Announcement read for the Reader. */
export async function markAllAnnouncementsRead(reader: Reader): Promise<void> {
  await markRead(reader, {});
}

async function markRead(reader: Reader, where: Prisma.AnnouncementWhereInput): Promise<void> {
  const unread = await prisma.announcement.findMany({
    where: { ...where, ...unreadBy(reader) },
    select: { id: true },
  });
  await prisma.announcementRead.createMany({
    data: unread.map(({ id }) => ({ userId: reader.id, announcementId: id })),
    skipDuplicates: true,
  });
}
