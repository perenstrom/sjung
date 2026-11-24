import { notFound, permanentRedirect } from "next/navigation";
import { getAnnouncementToEdit } from "@/app/actions/announcements";
import { AnnouncementEditor } from "@/components/announcements/AnnouncementEditor";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { manageAnnouncementsTrail } from "@/lib/announcements/breadcrumbs";
import { editAnnouncementPath } from "@/lib/announcements/routes";
import { findAnnouncementBySegment } from "@/lib/find-in-group";
import { requireOperatorPage } from "@/lib/operators/require-operator";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ announcementSlug: string }> }) {
  const { announcementSlug: segment } = await params;
  await requireOperatorPage();
  const match = await findAnnouncementBySegment(segment);
  if (!match) {
    notFound();
  }
  if (match.slug !== segment) {
    permanentRedirect(editAnnouncementPath(match));
  }
  const announcement = await getAnnouncementToEdit(match.id);

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar trail={manageAnnouncementsTrail(announcement.title)} />
      <h1 className="text-2xl font-semibold">Redigera nyhet</h1>
      <AnnouncementEditor announcement={announcement} />
    </div>
  );
}
