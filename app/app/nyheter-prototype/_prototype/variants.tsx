"use client";

// PROTOTYPE (PER-430), throwaway. Three structurally different reading views
// for Announcements, switched with ?variant= and the floating bar.

import Link from "next/link";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, CheckCheck, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENTS, excerpt, formatPublished, type PrototypeAnnouncement } from "./data";
import {
  markAllRead,
  markRead,
  parseVariant,
  prototypeHref,
  rememberVariant,
  useReadIds,
  useUnreadCount,
} from "./store";
import { PrototypeSwitcher } from "./switcher";

type Props = { variantParam: string | undefined; selectedId: string | null };

export function AnnouncementsPrototype({ variantParam, selectedId }: Props) {
  const variant = parseVariant(variantParam);
  useEffect(() => rememberVariant(variant), [variant]);

  const selected = selectedId ? ANNOUNCEMENTS.find((a) => a.id === selectedId) ?? null : null;

  return (
    <>
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: selected ? [{ label: "Nyheter", href: prototypeHref(variant) }] : [],
          tail: { kind: "static", label: selected ? selected.title : "Nyheter" },
        }}
      />
      {variant === "A" && <VariantA selected={selected} />}
      {variant === "B" && <VariantB selected={selected} />}
      {variant === "C" && <VariantC selected={selected} />}
      <PrototypeSwitcher current={variant} selectedId={selectedId} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared bits (kept small on purpose; layout is per variant)

function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      aria-label="Oläst"
      className={cn("inline-block size-2 shrink-0 rounded-full bg-blue-500", className)}
    />
  );
}

function MarkAllButton({ variant = "outline", size = "sm" }: { variant?: "outline" | "ghost" | "link"; size?: "sm" | "default" }) {
  const unread = useUnreadCount();
  return (
    <Button variant={variant} size={size} onClick={markAllRead} disabled={unread === 0}>
      <CheckCheck />
      Markera alla som lästa
    </Button>
  );
}

function AnnouncementBody({ body }: { body: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-lg prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}

function useMarkReadOnOpen(selected: PrototypeAnnouncement | null) {
  useEffect(() => {
    if (selected) markRead(selected.id);
  }, [selected]);
}

function NoAnnouncements() {
  return (
    <EmptyState icon={Newspaper} heading="Inga nyheter än">
      Här berättar vi när något nytt händer i Sjung.
    </EmptyState>
  );
}

// ---------------------------------------------------------------------------
// A: plain list page, each Announcement on a page of its own.

function VariantA({ selected }: { selected: PrototypeAnnouncement | null }) {
  useMarkReadOnOpen(selected);
  const readIds = useReadIds();

  if (selected) {
    return (
      <article className="mx-auto max-w-2xl space-y-6">
        <Link
          href={prototypeHref("A")}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Alla nyheter
        </Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{selected.title}</h1>
          <p className="text-muted-foreground text-sm">{formatPublished(selected.publishedAt)}</p>
        </header>
        <AnnouncementBody body={selected.body} />
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold">Nyheter</h1>
        <MarkAllButton />
      </div>
      {ANNOUNCEMENTS.length === 0 ? (
        <NoAnnouncements />
      ) : (
        <ul className="divide-y border-y">
          {ANNOUNCEMENTS.map((a) => {
            const unread = !readIds.has(a.id);
            return (
              <li key={a.id}>
                <Link
                  href={prototypeHref("A", a.id)}
                  className="hover:bg-muted/50 grid grid-cols-[0.75rem_1fr] gap-x-3 px-2 py-4"
                >
                  <span className="pt-2">{unread ? <UnreadDot /> : null}</span>
                  <span className="min-w-0 space-y-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn("text-base", unread ? "font-semibold" : "font-medium")}>{a.title}</span>
                      <span className="text-muted-foreground text-xs">{formatPublished(a.publishedAt)}</span>
                    </span>
                    <span className="text-muted-foreground line-clamp-2 block text-sm">{excerpt(a.body)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// B: inbox-style split view. List pane on the left, reading pane on the right
// (md and up). On phones it is list OR announcement, like A.

function VariantB({ selected }: { selected: PrototypeAnnouncement | null }) {
  useMarkReadOnOpen(selected);
  const readIds = useReadIds();
  const unreadCount = useUnreadCount();

  return (
    // From md up the split fills the space under the header exactly (100svh minus
    // the inset's 0.5rem margins and the 4rem header), and the list and the
    // reading pane each scroll on their own. On phones only one pane shows, so
    // the page scrolls as usual.
    <div className="-mx-4 -my-4 grid md:-my-8 md:-mr-8 md:-ml-12 md:h-[calc(100svh-5rem)] md:grid-cols-[20rem_1fr] md:overflow-hidden">
      <aside className={cn("min-h-0 flex-col border-r md:flex", selected ? "hidden" : "flex")}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Nyheter</h1>
            <p className="text-muted-foreground text-xs">
              {unreadCount === 0 ? "Allt är läst" : `${unreadCount} olästa`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            title="Markera alla som lästa"
            aria-label="Markera alla som lästa"
          >
            <CheckCheck />
          </Button>
        </div>
        <ul className="min-h-0 flex-1 md:overflow-y-auto">
          {ANNOUNCEMENTS.map((a) => {
            const unread = !readIds.has(a.id);
            const active = selected?.id === a.id;
            return (
              <li key={a.id}>
                <Link
                  href={prototypeHref("B", a.id)}
                  className={cn(
                    "block border-b px-4 py-3 text-sm",
                    active ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {unread ? <UnreadDot /> : <span className="size-2 shrink-0" />}
                    <span className={cn("min-w-0 flex-1 truncate", unread && "font-semibold")}>{a.title}</span>
                  </span>
                  <span className="text-muted-foreground mt-0.5 block pl-4 text-xs">
                    {formatPublished(a.publishedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className={cn("min-h-0 min-w-0 px-4 py-6 md:overflow-y-auto md:px-10 md:py-8 md:pb-24", selected ? "block" : "hidden md:block")}>
        {selected ? (
          <article className="max-w-2xl space-y-6">
            <Link
              href={prototypeHref("B")}
              className="text-muted-foreground inline-flex items-center gap-1 text-sm md:hidden"
            >
              <ArrowLeft className="size-4" /> Alla nyheter
            </Link>
            <header className="space-y-1 border-b pb-4">
              <h2 className="text-2xl font-semibold">{selected.title}</h2>
              <p className="text-muted-foreground text-sm">{formatPublished(selected.publishedAt)}</p>
            </header>
            <AnnouncementBody body={selected.body} />
          </article>
        ) : (
          <EmptyState icon={Newspaper} heading="Välj en nyhet">
            {unreadCount === 0
              ? "Du har läst allt. Välj en nyhet i listan för att läsa den igen."
              : `Du har ${unreadCount} olästa nyheter i listan.`}
          </EmptyState>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// C: changelog timeline. Grouped by month; unread ones are full cards with a
// "Ny" badge, read ones fold to a single line. The announcement page has
// previous/next navigation instead of going back to the list.

function monthKey(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" }).format(date);
}

function VariantC({ selected }: { selected: PrototypeAnnouncement | null }) {
  useMarkReadOnOpen(selected);
  const readIds = useReadIds();
  const unreadCount = useUnreadCount();

  if (selected) {
    const index = ANNOUNCEMENTS.findIndex((a) => a.id === selected.id);
    const newer = ANNOUNCEMENTS[index - 1];
    const older = ANNOUNCEMENTS[index + 1];
    return (
      <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-[8rem_1fr]">
        <div className="text-muted-foreground text-sm md:pt-2 md:text-right">
          <Link href={prototypeHref("C")} className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Tidslinjen
          </Link>
          <p className="mt-2 hidden md:block">{formatPublished(selected.publishedAt)}</p>
        </div>
        <article className="min-w-0 space-y-6">
          <header className="space-y-1">
            <p className="text-muted-foreground text-sm md:hidden">{formatPublished(selected.publishedAt)}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{selected.title}</h1>
          </header>
          <AnnouncementBody body={selected.body} />
          <nav className="grid grid-cols-2 gap-3 border-t pt-6 text-sm">
            {older ? (
              <Link href={prototypeHref("C", older.id)} className="hover:bg-muted/50 rounded-md border p-3">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <ChevronLeft className="size-3" /> Äldre
                </span>
                <span className="mt-1 line-clamp-2 block font-medium">{older.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link href={prototypeHref("C", newer.id)} className="hover:bg-muted/50 rounded-md border p-3 text-right">
                <span className="text-muted-foreground flex items-center justify-end gap-1 text-xs">
                  Nyare <ChevronRight className="size-3" />
                </span>
                <span className="mt-1 line-clamp-2 block font-medium">{newer.title}</span>
              </Link>
            ) : null}
          </nav>
        </article>
      </div>
    );
  }

  const months = new Map<string, PrototypeAnnouncement[]>();
  for (const a of ANNOUNCEMENTS) {
    const key = monthKey(a.publishedAt);
    months.set(key, [...(months.get(key) ?? []), a]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Nyheter</h1>
      {unreadCount > 0 ? (
        <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm">
          <span>
            Du har <strong>{unreadCount}</strong> {unreadCount === 1 ? "oläst nyhet" : "olästa nyheter"}.
          </span>
          <MarkAllButton variant="link" />
        </div>
      ) : null}
      <ol className="relative space-y-8 border-l pl-6">
        {[...months.entries()].map(([month, items]) => (
          <li key={month} className="space-y-3">
            <h2 className="text-muted-foreground -ml-[1.85rem] flex items-center gap-3 text-xs font-medium tracking-wide uppercase">
              <span className="bg-background ring-border size-2.5 rounded-full ring-2" />
              {month}
            </h2>
            <ul className="space-y-2">
              {items.map((a) => {
                const unread = !readIds.has(a.id);
                return (
                  <li key={a.id}>
                    {unread ? (
                      <Link
                        href={prototypeHref("C", a.id)}
                        className="hover:border-primary/50 block space-y-2 rounded-lg border p-4 shadow-xs"
                      >
                        <span className="flex items-center gap-2">
                          <Badge>Ny</Badge>
                          <span className="text-muted-foreground text-xs">{formatPublished(a.publishedAt)}</span>
                        </span>
                        <span className="block text-lg font-semibold">{a.title}</span>
                        <span className="text-muted-foreground line-clamp-3 block text-sm">{excerpt(a.body)}</span>
                        <span className="text-primary block text-sm font-medium">Läs mer →</span>
                      </Link>
                    ) : (
                      <Link
                        href={prototypeHref("C", a.id)}
                        className="hover:bg-muted/50 flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                      >
                        <span className="min-w-0 truncate">{a.title}</span>
                        <span className="text-muted-foreground shrink-0 text-xs">{formatPublished(a.publishedAt)}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
