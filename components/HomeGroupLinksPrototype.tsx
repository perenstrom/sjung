"use client";

// PROTOTYPE: throwaway. Never merge to main.
// Question: how should Group links sit beside the Group description on Home —
// at what width of Home's own column (a container query, so an open or
// collapsed sidebar counts) do they go side by side, and how is the width split?
// Four variants via ?variant=A|B|C|D|E; ?n= sets how many links (0 hides the
// column), ?desc=real|short|long|none swaps the description.

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { GroupDescriptionSection } from "@/components/home/GroupDescriptionSection";
import { MobileList, MobileListRow } from "@/components/ui/mobile-list";
import { cn } from "@/lib/utils";

const VARIANTS = [
  { key: "A", name: "column ≥ 48rem · ⅔ + ⅓, plain list" },
  { key: "B", name: "column ≥ 42rem · ½ + ½, plain list" },
  { key: "C", name: "column ≥ 48rem · fluid + fixed 18rem, bordered rows" },
  { key: "D", name: "column ≥ 42rem · ⅗ + ⅖, bordered rows" },
  { key: "E", name: "column ≥ 48rem · fluid + fixed 18rem, bulleted list" },
];

const ALL_LINKS = [
  { label: "Facebook-gruppen", href: "https://www.facebook.com/groups/vastkoren" },
  { label: "Kalender", href: "https://calendar.google.com/calendar/u/0?cid=abc" },
  { label: "Swish för terminsavgift", href: "https://app.swish.nu/1/p/sw/?sw=1234567" },
  { label: "Vägbeskrivning till Kyrkans hus", href: "https://maps.app.goo.gl/xyz" },
  { label: "Stämfiler i Dropbox (gamla)", href: "https://www.dropbox.com/sh/abc" },
  { label: "Körförbundet", href: "https://www.korforbundet.se" },
  { label: "Anmälan till körresan 2027", href: "https://forms.gle/abc" },
  { label: "Styrelseprotokoll", href: "https://docs.google.com/document/d/abc" },
  { label: "Instagram", href: "https://www.instagram.com/vastkoren" },
  { label: "Medlemsregister", href: "https://ebas.sverigeskorer.se" },
  { label: "Nothäften att köpa", href: "https://www.gehrmans.se" },
  { label: "Julkonsertens biljetter", href: "https://www.tickster.com/se/sv/events/abc" },
];

const SHORT = "Vi repeterar tisdagar 19–21 i Kyrkans hus. Frågor? Hör av dig till Anna.";
const LONG = `## Välkommen till Västkören!

Vi repeterar **tisdagar 19.00–21.30** i Kyrkans hus, Storgatan 12. Kom gärna tio minuter innan så hinner vi börja i tid.

Inför konserter har vi extra repetitioner på lördagar, de står i kalendern. Har du förhinder, säg till din stämledare.

### Stämledare

- Sopran: Anna
- Alt: Birgitta
- Tenor: Carl
- Bas: David

Terminsavgiften är 600 kr och betalas senast 1 oktober.`;

type GroupLink = { label: string; href: string };

function host(href: string) {
  return new URL(href).host.replace(/^www\./, "");
}

function sorted(links: GroupLink[]) {
  return [...links].sort((a, b) => a.label.localeCompare(b.label, "sv", { numeric: true }));
}

/** Label as the link, host muted after it; the plain look. */
function PlainLinks({ links }: { links: GroupLink[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">Länkar</h2>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.href} className="leading-snug">
            <a href={link.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {link.label}
            </a>
            <span className="text-sm text-muted-foreground"> · {host(link.href)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Bulleted, label as the link and the host muted on its own line beneath. */
function BulletLinks({ links }: { links: GroupLink[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">Länkar</h2>
      <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">
        {links.map((link) => (
          <li key={link.href} className="leading-snug">
            <a href={link.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {link.label}
            </a>
            <span className="block truncate text-sm text-muted-foreground">{host(link.href)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Same rows as Current Set lists: label primary, host secondary. */
function RowLinks({ links }: { links: GroupLink[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">Länkar</h2>
      <MobileList className="md:mx-0 md:block md:rounded-md md:border">
        {links.map((link) => (
          <MobileListRow key={link.href} href={link.href} primary={link.label} secondary={host(link.href)} />
        ))}
      </MobileList>
    </section>
  );
}

export function HomeGroupLinksPrototype({
  groupSlug,
  description,
  hasCoverImage,
}: {
  groupSlug: string;
  description: string | null;
  hasCoverImage: boolean;
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  const n = Math.min(ALL_LINKS.length, Math.max(0, Number(searchParams.get("n") ?? 5)));
  const desc = searchParams.get("desc") ?? "long";
  const shownDescription =
    desc === "none" ? null : desc === "short" ? SHORT : desc === "long" ? LONG : description;
  const links = sorted(ALL_LINKS.slice(0, n));

  const descriptionSection = (
    <GroupDescriptionSection groupSlug={groupSlug} description={shownDescription} hasCoverImage={hasCoverImage} />
  );
  const both = shownDescription !== null && links.length > 0;

  let body: React.ReactNode;
  if (variant === "A") {
    body = (
      <div className={cn("grid gap-4 md:gap-6", both && "@3xl:grid-cols-3 @3xl:gap-10")}>
        <div className={cn(both && "@3xl:col-span-2")}>{descriptionSection}</div>
        {links.length > 0 ? <PlainLinks links={links} /> : null}
      </div>
    );
  } else if (variant === "B") {
    body = (
      <div className={cn("grid gap-4 md:gap-6", both && "@2xl:grid-cols-2 @2xl:gap-8")}>
        {descriptionSection}
        {links.length > 0 ? <PlainLinks links={links} /> : null}
      </div>
    );
  } else if (variant === "C") {
    body = (
      <div className={cn("grid gap-4 md:gap-6", both && "@3xl:grid-cols-[minmax(0,1fr)_18rem] @3xl:gap-10")}>
        <div className="min-w-0">{descriptionSection}</div>
        {links.length > 0 ? <RowLinks links={links} /> : null}
      </div>
    );
  } else if (variant === "E") {
    body = (
      <div className={cn("grid gap-4 md:gap-6", both && "@3xl:grid-cols-[minmax(0,1fr)_18rem] @3xl:gap-10")}>
        <div className="min-w-0">{descriptionSection}</div>
        {links.length > 0 ? <BulletLinks links={links} /> : null}
      </div>
    );
  } else {
    body = (
      <div className={cn("grid gap-4 md:gap-6", both && "@2xl:grid-cols-5 @2xl:gap-8")}>
        <div className={cn("min-w-0", both && "@2xl:col-span-3")}>{descriptionSection}</div>
        {links.length > 0 ? (
          <div className={cn(both && "@2xl:col-span-2")}>
            <RowLinks links={links} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* The query container: Home's own column, whatever the sidebar is doing. */}
      <div className="@container">{body}</div>
      <PrototypeSwitcher variants={VARIANTS} current={variant}>
        <div className="flex items-center gap-3 text-xs text-white/80">
          <span>n={n}</span>
          <span>desc={desc}</span>
          <ColumnWidth />
          <span className="text-white/50">?n=0–12 · ?desc=real|short|long|none</span>
        </div>
      </PrototypeSwitcher>
    </>
  );
}

/** Shows the width of Home's column live, so the thresholds can be judged with the sidebar open and closed. */
function ColumnWidth() {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const column = document.querySelector<HTMLElement>(".\\@container");
    if (!column) return;
    const observer = new ResizeObserver(() => setWidth(column.clientWidth));
    observer.observe(column);
    return () => observer.disconnect();
  }, []);
  return width === null ? null : <span>column={width}px ({(width / 16).toFixed(1)}rem)</span>;
}
