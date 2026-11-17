import { notFound } from "next/navigation";
import { getAnnouncement, getAnnouncementsInbox } from "@/app/actions/announcements";
import { AnnouncementsInbox } from "@/components/announcements/AnnouncementsInbox";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { announcementsTrail } from "@/lib/announcements/breadcrumbs";

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [selected, { announcements, canManage }] = await Promise.all([
    getAnnouncement(id),
    getAnnouncementsInbox(),
  ]);
  if (!selected) {
    notFound();
  }

  return (
    <>
      <BreadcrumbRegistrar trail={announcementsTrail(selected.title)} />
      <AnnouncementsInbox announcements={announcements} selected={selected} canManage={canManage} />
    </>
  );
}
