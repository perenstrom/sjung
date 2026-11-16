import { getAnnouncementToEdit } from "@/app/actions/announcements";
import { AnnouncementEditor } from "@/components/announcements/AnnouncementEditor";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { manageAnnouncementsTrail } from "@/lib/announcements/breadcrumbs";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const announcement = await getAnnouncementToEdit(id);

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar trail={manageAnnouncementsTrail(announcement.title)} />
      <h1 className="text-2xl font-semibold">Redigera nyhet</h1>
      <AnnouncementEditor announcement={announcement} />
    </div>
  );
}
