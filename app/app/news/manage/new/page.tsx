import { AnnouncementEditor } from "@/components/announcements/AnnouncementEditor";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { manageAnnouncementsTrail } from "@/lib/announcements/breadcrumbs";
import { requireOperatorPage } from "@/lib/announcements/require-operator";

export default async function NewAnnouncementPage() {
  await requireOperatorPage();

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar trail={manageAnnouncementsTrail("Ny nyhet")} />
      <h1 className="text-2xl font-semibold">Ny nyhet</h1>
      <AnnouncementEditor />
    </div>
  );
}
