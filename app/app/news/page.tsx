import { getAnnouncementsInbox } from "@/app/actions/announcements";
import { AnnouncementsInbox } from "@/components/announcements/AnnouncementsInbox";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { announcementsTrail } from "@/lib/announcements/breadcrumbs";

export default async function AnnouncementsPage() {
  const { announcements, canManage } = await getAnnouncementsInbox();

  return (
    <>
      <BreadcrumbRegistrar trail={announcementsTrail(null)} />
      <AnnouncementsInbox announcements={announcements} selected={null} canManage={canManage} />
    </>
  );
}
