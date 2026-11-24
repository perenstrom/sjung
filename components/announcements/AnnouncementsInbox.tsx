import Link from "next/link";
import { ArrowLeft, Newspaper, Settings2 } from "lucide-react";
import { AnnouncementBody } from "@/components/announcements/AnnouncementBody";
import { AnnouncementReadMarker } from "@/components/announcements/AnnouncementReadMarker";
import { MarkAllAnnouncementsReadButton } from "@/components/announcements/MarkAllAnnouncementsReadButton";
import { UnreadDot } from "@/components/announcements/UnreadDot";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnnouncementDetail, AnnouncementListItem } from "@/lib/announcements/announcements";
import { ANNOUNCEMENTS_PATH, announcementPath, MANAGE_ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type AnnouncementsInboxProps = {
  announcements: AnnouncementListItem[];
  /** The Announcement open in the reading pane; null shows the list only. */
  selected: AnnouncementDetail | null;
  /** Operators get a link to Hantera nyheter. */
  canManage: boolean;
};

/**
 * Nyheter as an inbox: a list pane and a reading pane. From `md` up they sit
 * side by side, fill the space under the app header and scroll on their own.
 * Below `md` only one shows: the list, or the open Announcement.
 */
export function AnnouncementsInbox({ announcements, selected, canManage }: AnnouncementsInboxProps) {
  // The open Announcement is being marked read as it is shown, so it already
  // counts as read here rather than flickering from unread to read.
  const isRead = (announcement: AnnouncementListItem) => announcement.read || announcement.id === selected?.id;
  const unreadCount = announcements.filter((announcement) => !isRead(announcement)).length;

  return (
    // The negative margins undo the app's <main> padding; 5rem is the 4rem
    // header plus the inset's 0.5rem margin above and below.
    <div className="-mx-4 -my-4 grid grid-cols-[minmax(0,1fr)] md:-my-8 md:-mr-8 md:-ml-12 md:h-[calc(100svh-5rem)] md:grid-cols-[20rem_minmax(0,1fr)] md:overflow-hidden">
      <aside className={cn("min-h-0 min-w-0 flex-col md:flex md:border-r", selected ? "hidden" : "flex")}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Nyheter</h1>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0 ? "Allt är läst" : `${unreadCount} olästa`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {canManage ? (
              <Button asChild variant="ghost" size="icon" title="Hantera nyheter">
                <Link href={MANAGE_ANNOUNCEMENTS_PATH} aria-label="Hantera nyheter">
                  <Settings2 />
                </Link>
              </Button>
            ) : null}
            <MarkAllAnnouncementsReadButton disabled={unreadCount === 0} />
          </div>
        </div>
        {announcements.length === 0 ? (
          <EmptyState icon={Newspaper} heading="Inga nyheter än">
            Här berättar vi när något nytt händer i Sjung.
          </EmptyState>
        ) : (
          // Relative, so the absolutely positioned sr-only labels stay inside
          // the scrolling pane instead of stretching the page.
          <ul className="relative min-h-0 flex-1 md:overflow-y-auto">
            {announcements.map((announcement) => {
              const unread = !isRead(announcement);
              const active = announcement.id === selected?.id;
              return (
                <li key={announcement.id}>
                  <Link
                    href={announcementPath(announcement)}
                    aria-current={active ? "page" : undefined}
                    className={cn("block border-b px-4 py-3 text-sm", active ? "bg-muted" : "hover:bg-muted/50")}
                  >
                    <span className="flex items-center gap-2">
                      {unread ? <UnreadDot /> : <span className="size-2 shrink-0" />}
                      <span className={cn("min-w-0 flex-1 truncate", unread && "font-semibold")}>
                        {announcement.title}
                        {unread ? <span className="sr-only">, oläst</span> : null}
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-4 text-xs text-muted-foreground">
                      {formatDate(announcement.publishedAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <section
        className={cn(
          "relative min-h-0 min-w-0 px-4 py-6 md:overflow-y-auto md:px-10 md:py-8 md:pb-24",
          selected ? "block" : "hidden md:block",
        )}
      >
        {selected ? (
          <article className="max-w-2xl space-y-6">
            <AnnouncementReadMarker id={selected.id} />
            <Link
              href={ANNOUNCEMENTS_PATH}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground md:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Alla nyheter
            </Link>
            <header className="space-y-1 border-b pb-4">
              <h2 className="text-2xl font-semibold">{selected.title}</h2>
              <p className="text-sm text-muted-foreground">{formatDate(selected.publishedAt)}</p>
            </header>
            <AnnouncementBody body={selected.body} />
          </article>
        ) : announcements.length > 0 ? (
          <EmptyState icon={Newspaper} heading="Välj en nyhet">
            {unreadCount === 0
              ? "Du har läst allt. Välj en nyhet i listan för att läsa den igen."
              : "Välj en nyhet i listan för att läsa den."}
          </EmptyState>
        ) : null}
      </section>
    </div>
  );
}
