"use client";

// PROTOTYPE (PER-495): how a Current Set list is shown on Home. Four variants,
// switchable via ?variant=, plus ?n= to show only the first n Current Set lists.
// Throwaway: never merge to main.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, ListMusic } from "lucide-react";
import { useState } from "react";

import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { Badge } from "@/components/ui/badge";
import { groupSetListPath } from "@/lib/groups/routes";
import { pieceHref } from "@/lib/pieces/href";
import { cn } from "@/lib/utils";

type HomeStep =
  | { kind: "piece"; id: string; pieceName: string; pieceSlug: string }
  | { kind: "note"; id: string; content: string };

export type HomeSetList = {
  id: string;
  slug: string;
  name: string;
  dateLabel: string | null;
  steps: HomeStep[];
};

type VariantProps = { groupSlug: string; setLists: HomeSetList[] };

const VARIANTS = [
  { key: "A", name: "Lista: bara namn, till repertoaren" },
  { key: "B", name: "Hela ordningen, stycken direkt" },
  { key: "C", name: "Flikar: en repertoar i fokus" },
  { key: "D", name: "Kort i karusell, första styckena" },
];

function pieceCount(setList: HomeSetList) {
  const count = setList.steps.filter((step) => step.kind === "piece").length;
  return `${count} ${count === 1 ? "stycke" : "stycken"}`;
}

function meta(setList: HomeSetList) {
  return [setList.dateLabel, pieceCount(setList)].filter(Boolean).join(" · ");
}

function SectionHeading() {
  return <h2 className="text-lg font-medium">Aktuellt</h2>;
}

/**
 * A (chosen in PER-495): one row per Current Set list, like the Repertoarer
 * list but only the Current ones, under "Aktuella repertoarer" ("Aktuell
 * repertoar" when there is one).
 */
function VariantA({ groupSlug, setLists }: VariantProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{setLists.length === 1 ? "Aktuell repertoar" : "Aktuella repertoarer"}</h2>
      <ul className="-mx-4 divide-y border-y md:mx-0 md:rounded-md md:border">
        {setLists.map((setList) => (
          <li key={setList.id} className="relative flex min-h-14 items-center gap-2 px-4 py-2 has-[a:active]:bg-muted/50">
            <div className="min-w-0 flex-1">
              <Link href={groupSetListPath(groupSlug, setList)} className="after:absolute after:inset-0">
                <span className="block truncate font-medium">{setList.name}</span>
              </Link>
              <span className="block truncate text-sm text-muted-foreground">{meta(setList)}</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RunningOrder({
  groupSlug,
  setList,
  large = false,
}: {
  groupSlug: string;
  setList: HomeSetList;
  large?: boolean;
}) {
  let number = 0;
  return (
    <ol className="divide-y">
      {setList.steps.map((step) =>
        step.kind === "note" ? (
          <li key={step.id} className="px-1 py-2 text-sm text-muted-foreground italic">
            {step.content}
          </li>
        ) : (
          <li key={step.id} className="relative has-[a:active]:bg-muted/50">
            <Link
              href={pieceHref(groupSlug, { slug: step.pieceSlug }, { fromSetListPieceId: step.id })}
              className={cn("flex items-center gap-3 px-1", large ? "min-h-14 py-3 text-lg" : "min-h-11 py-2")}
            >
              <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{++number}</span>
              <span className="min-w-0 flex-1 truncate">{step.pieceName}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ),
      )}
    </ol>
  );
}

/** B: every Current Set list with its whole running order; tapping a Piece opens it from that Set list piece. */
function VariantB({ groupSlug, setLists }: VariantProps) {
  return (
    <section className="space-y-6">
      <SectionHeading />
      {setLists.map((setList) => (
        <div key={setList.id} className="space-y-1">
          <Link href={groupSetListPath(groupSlug, setList)} className="group flex items-baseline gap-2">
            <h3 className="text-base font-semibold group-hover:underline">{setList.name}</h3>
            <span className="text-sm text-muted-foreground">{setList.dateLabel}</span>
          </Link>
          {setList.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga stycken än.</p>
          ) : (
            <RunningOrder groupSlug={groupSlug} setList={setList} />
          )}
        </div>
      ))}
    </section>
  );
}

/** C: one Current Set list in focus, big tap targets for rehearsal; tabs switch between them when there are several. */
function VariantC({ groupSlug, setLists }: VariantProps) {
  const [selectedId, setSelectedId] = useState(setLists[0]?.id);
  const selected = setLists.find((setList) => setList.id === selectedId) ?? setLists[0];
  if (!selected) return null;
  return (
    <section className="space-y-3">
      {setLists.length > 1 ? (
        <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {setLists.map((setList) => (
            <button
              key={setList.id}
              role="tab"
              type="button"
              aria-selected={setList.id === selected.id}
              onClick={() => setSelectedId(setList.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
                setList.id === selected.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              {setList.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-semibold">{selected.name}</h2>
            <Badge variant="secondary">Aktuell</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{meta(selected)}</p>
        </div>
        <Link href={groupSetListPath(groupSlug, selected)} className="shrink-0 text-sm underline underline-offset-4">
          Öppna repertoaren
        </Link>
      </div>
      <RunningOrder groupSlug={groupSlug} setList={selected} large />
    </section>
  );
}

const PREVIEW_PIECES = 3;

/** D: a swipeable row of cards, each with its first few Pieces and a way into the whole Set list. */
function VariantD({ groupSlug, setLists }: VariantProps) {
  return (
    <section className="space-y-2">
      <SectionHeading />
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:px-0">
        {setLists.map((setList) => {
          const pieces = setList.steps.filter((step) => step.kind === "piece");
          const rest = pieces.length - PREVIEW_PIECES;
          return (
            <article
              key={setList.id}
              className={cn(
                "flex shrink-0 snap-start flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:w-auto",
                setLists.length === 1 ? "w-full" : "w-[85%]",
              )}
            >
              <div className="flex items-start gap-3">
                <ListMusic className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{setList.name}</h3>
                  <p className="text-sm text-muted-foreground">{meta(setList)}</p>
                </div>
              </div>
              <ul className="space-y-1">
                {pieces.slice(0, PREVIEW_PIECES).map((step) => (
                  <li key={step.id}>
                    <Link
                      href={pieceHref(groupSlug, { slug: step.pieceSlug }, { fromSetListPieceId: step.id })}
                      className="block truncate rounded px-2 py-1.5 hover:bg-muted"
                    >
                      {step.pieceName}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={groupSetListPath(groupSlug, setList)}
                className="mt-auto flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm font-medium"
              >
                {rest > 0 ? `Visa hela (${rest} till)` : "Öppna repertoaren"}
                <ChevronRight className="size-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CountPicker({ total, current }: { total: number; current: number | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  function set(n: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (n === null) params.delete("n");
    else params.set("n", String(n));
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }
  const options = Array.from({ length: Math.min(total, 4) }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="opacity-70">Aktuella:</span>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => set(n)}
          className={cn("rounded px-1.5 py-0.5", current === n ? "bg-white text-zinc-900" : "hover:bg-white/15")}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => set(null)}
        className={cn("rounded px-1.5 py-0.5", current === null ? "bg-white text-zinc-900" : "hover:bg-white/15")}
      >
        alla ({total})
      </button>
    </div>
  );
}

export function HomeCurrentSetListsPrototype({ groupSlug, setLists }: VariantProps) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  const nParam = searchParams.get("n");
  const n = nParam ? Number(nParam) : null;
  const shown = n ? setLists.slice(0, n) : setLists;
  const props = { groupSlug, setLists: shown };

  return (
    <>
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC key={shown.length} {...props} />}
      {variant === "D" && <VariantD {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant}>
        <CountPicker total={setLists.length} current={n} />
      </PrototypeSwitcher>
    </>
  );
}
