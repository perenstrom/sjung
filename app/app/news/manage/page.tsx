import Link from "next/link";
import { Newspaper, Pencil, Plus } from "lucide-react";
import { getAnnouncementsToManage } from "@/app/actions/announcements";
import { DeleteAnnouncementDialog } from "@/components/announcements/DeleteAnnouncementDialog";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { manageAnnouncementsTrail } from "@/lib/announcements/breadcrumbs";
import { announcementPath, editAnnouncementPath, NEW_ANNOUNCEMENT_PATH } from "@/lib/announcements/routes";
import { formatDate } from "@/lib/format-date";

/** Hantera nyheter: Operators only. Everyone else gets not found. */
export default async function ManageAnnouncementsPage() {
  const announcements = await getAnnouncementsToManage();

  return (
    <div className="max-w-3xl space-y-4 md:space-y-6">
      <BreadcrumbRegistrar trail={manageAnnouncementsTrail(null)} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold">Hantera nyheter</h1>
        <Button asChild size="sm">
          <Link href={NEW_ANNOUNCEMENT_PATH}>
            <Plus /> Ny nyhet
          </Link>
        </Button>
      </div>
      {announcements.length === 0 ? (
        <EmptyState icon={Newspaper} heading="Inga nyheter än">
          En ny nyhet publiceras direkt för alla användare.
        </EmptyState>
      ) : (
        <ul className="divide-y border-y">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="flex items-center gap-2 py-2">
              <Link href={announcementPath(announcement.id)} className="min-w-0 flex-1 px-2 py-1 hover:underline">
                <span className="block truncate font-medium">{announcement.title}</span>
                <span className="block text-xs text-muted-foreground">
                  Publicerad {formatDate(announcement.publishedAt)}
                </span>
              </Link>
              <Button asChild variant="ghost" size="icon">
                <Link href={editAnnouncementPath(announcement.id)} aria-label={`Redigera ${announcement.title}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <DeleteAnnouncementDialog announcement={announcement} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
