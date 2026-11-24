import { notFound, permanentRedirect } from "next/navigation";
import { getAnnouncement, getAnnouncementsInbox } from "@/app/actions/announcements";
import { AnnouncementsInbox } from "@/components/announcements/AnnouncementsInbox";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { announcementsTrail } from "@/lib/announcements/breadcrumbs";
import { announcementPath } from "@/lib/announcements/routes";
import { requireUser } from "@/lib/auth/require-user";
import { findAnnouncementBySegment } from "@/lib/find-in-group";

export default async function AnnouncementPage({ params }: { params: Promise<{ announcementSlug: string }> }) {
  const { announcementSlug: segment } = await params;
  await requireUser();
  const match = await findAnnouncementBySegment(segment);
  if (!match) {
    notFound();
  }
  // A link by id always works and moves to the Slug URL (ADR-0011).
  if (match.slug !== segment) {
    permanentRedirect(announcementPath(match));
  }
  const [selected, { announcements, canManage }] = await Promise.all([
    getAnnouncement(match.id),
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
