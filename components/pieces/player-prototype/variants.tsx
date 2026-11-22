"use client";

// PROTOTYPE (PER-458): three structurally different player views.
//   A  Musikapp     – score fills the screen, a transport dock at the bottom,
//                     tempo/repeat/mixer each behind a button in a bottom sheet.
//   B  Mixerbord    – parts always visible as channel strips; the score is a
//                     panel you open; a compact transport bar on top.
//   C  Övningsläge  – "which part do you sing?" first, big preset cards, one big
//                     play button, a one-line score strip; the full mixer is
//                     folded away under "Fler reglage".

import { Music, Repeat, SlidersHorizontal, Timer } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  ChannelRow,
  LoopStatus,
  MyPartPicker,
  NoScoreNotice,
  PlayButton,
  type PlayerContext,
  PlayerHeader,
  PresetButtons,
  SeekBar,
  TempoSlider,
  TempoStepper,
} from "./controls";
import { ScoreStub } from "./ScoreStub";
import type { PlayerState } from "./usePlayerState";

type VariantProps = { ctx: PlayerContext; state: PlayerState };

function Shell({ children }: { children: ReactNode }) {
  // Full screen over the app shell, as on a phone (below the prototype strip).
  return <div className="fixed inset-x-0 top-9 bottom-0 z-40 flex flex-col bg-background">{children}</div>;
}

// ---------------------------------------------------------------- A

type SheetKey = "mix" | "tempo" | "loop" | null;

export function VariantA({ ctx, state }: VariantProps) {
  const [sheet, setSheet] = useState<SheetKey>(null);
  const hasParts = state.fixture.parts.length > 0;
  const dockButton = (key: Exclude<SheetKey, null>, icon: ReactNode, label: string, active: boolean) => (
    <button
      type="button"
      onClick={() => setSheet(key)}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px]",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Shell>
      <PlayerHeader ctx={ctx} state={state} />
      <main className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {state.fixture.hasScore ? (
          <ScoreStub state={state} />
        ) : (
          <div className="grid h-full place-items-center px-6">
            <div className="space-y-3 text-center">
              <Music className="mx-auto size-16 text-muted-foreground/40" />
              <NoScoreNotice state={state} />
            </div>
          </div>
        )}
      </main>
      <footer className="border-t bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        <SeekBar state={state} />
        <div className="mt-1 flex items-center justify-between">
          {dockButton("tempo", <Timer className="size-5" />, `${state.tempo} %`, state.tempo !== 100)}
          {dockButton("loop", <Repeat className="size-5" />, "Repetera", state.loop?.b != null)}
          <PlayButton state={state} />
          {hasParts ? (
            dockButton("mix", <SlidersHorizontal className="size-5" />, "Stämmor", state.preset !== "all" || Object.values(state.channels).some((c) => c.muted || c.solo || c.volume !== 80))
          ) : (
            <span className="w-14" />
          )}
          <span className="w-14 text-center text-[11px] text-muted-foreground">
            {state.myPart ? state.fixture.parts.find((p) => p.id === state.myPart)?.label : ""}
          </span>
        </div>
      </footer>

      <Sheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>{sheet === "mix" ? "Stämmor" : sheet === "tempo" ? "Tempo" : "Repetera"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            {sheet === "mix" ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Min stämma</p>
                  <MyPartPicker state={state} />
                  <PresetButtons state={state} />
                </div>
                <div className="divide-y border-t">
                  {state.fixture.parts.map((p) => (
                    <ChannelRow key={p.id} state={state} part={p} />
                  ))}
                </div>
              </>
            ) : null}
            {sheet === "tempo" ? <TempoSlider state={state} /> : null}
            {sheet === "loop" ? <LoopStatus state={state} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </Shell>
  );
}

// ---------------------------------------------------------------- B

export function VariantB({ ctx, state }: VariantProps) {
  const [scoreOpen, setScoreOpen] = useState(state.fixture.hasScore);
  const hasParts = state.fixture.parts.length > 0;

  return (
    <Shell>
      <PlayerHeader ctx={ctx} state={state} />
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <PlayButton state={state} size="md" />
        <SeekBar state={state} className="min-w-0 flex-1" />
      </div>
      <div className="flex gap-2 overflow-x-auto border-b px-3 py-2 text-xs">
        <label className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1">
          <Timer className="size-3.5" />
          <select
            value={state.tempo}
            onChange={(e) => state.setTempo(Number(e.target.value))}
            className="bg-transparent"
          >
            {[50, 60, 70, 75, 80, 90, 100, 110, 120].map((t) => (
              <option key={t} value={t}>
                {t} %
              </option>
            ))}
          </select>
        </label>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2 py-1",
            state.loop?.b != null && "border-amber-500 bg-amber-100 dark:bg-amber-900/40"
          )}
        >
          <Repeat className="size-3.5" />
          {state.loop?.b != null ? "Repeterar" : "Ingen repetition"}
        </span>
        {state.fixture.hasScore ? (
          <button
            type="button"
            onClick={() => setScoreOpen((o) => !o)}
            className={cn("flex shrink-0 items-center gap-1 rounded-full border px-2 py-1", scoreOpen && "bg-muted")}
          >
            <Music className="size-3.5" />
            {scoreOpen ? "Dölj noter" : "Visa noter"}
          </button>
        ) : null}
      </div>

      {scoreOpen && state.fixture.hasScore ? (
        <div className="max-h-[38dvh] shrink-0 overflow-y-auto border-b px-2 py-2">
          <ScoreStub state={state} barsPerSystem={4} />
        </div>
      ) : null}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {hasParts ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg bg-muted/50 p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Min stämma</span>
                <MyPartPicker state={state} />
              </div>
              <PresetButtons state={state} />
            </div>
            <div className="divide-y">
              {state.fixture.parts.map((p) => (
                <ChannelRow key={p.id} state={state} part={p} big />
              ))}
            </div>
            <LoopStatus state={state} className="rounded-lg border p-2" />
          </div>
        ) : (
          <div className="space-y-4 pt-6">
            <NoScoreNotice state={state} />
            <p className="text-center text-sm text-muted-foreground">En enda ljudfil – inga stämmor att mixa.</p>
            <LoopStatus state={state} className="rounded-lg border p-2" />
          </div>
        )}
      </main>
    </Shell>
  );
}

// ---------------------------------------------------------------- C

export function VariantC({ ctx, state }: VariantProps) {
  const [more, setMore] = useState(false);
  const [scoreBig, setScoreBig] = useState(false);
  const voices = state.fixture.parts.filter((p) => p.kind === "voice");

  return (
    <Shell>
      <PlayerHeader ctx={ctx} state={state} />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {state.fixture.hasScore ? (
          <div className="border-b px-2 py-2">
            <ScoreStub
              state={state}
              barsPerSystem={scoreBig ? 4 : 3}
              only={scoreBig ? undefined : "current"}
              className={scoreBig ? "max-h-[50dvh] overflow-y-auto" : undefined}
            />
            <button
              type="button"
              onClick={() => setScoreBig((b) => !b)}
              className="block w-full pt-1 text-center text-[11px] text-muted-foreground underline"
            >
              {scoreBig ? "Visa en rad noter" : "Visa alla noter"}
            </button>
          </div>
        ) : null}

        <div className="space-y-5 px-4 py-4">
          {voices.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-base font-medium">Vilken stämma sjunger du?</h2>
              <MyPartPicker state={state} />
              {state.myPart ? <PresetButtons state={state} layout="cards" /> : null}
            </section>
          ) : (
            <NoScoreNotice state={state} />
          )}

          <section className="flex flex-col items-center gap-3">
            <PlayButton state={state} size="xl" />
            <SeekBar state={state} className="w-full" />
          </section>

          <section className="space-y-3 rounded-xl border p-3">
            <TempoStepper state={state} />
            <LoopStatus state={state} />
          </section>

          {state.fixture.parts.length > 0 ? (
            <section className="rounded-xl border">
              <button
                type="button"
                onClick={() => setMore((m) => !m)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4" /> Fler reglage
                </span>
                <span className="text-muted-foreground">{more ? "Dölj" : "Visa"}</span>
              </button>
              {more ? (
                <div className="divide-y border-t px-3">
                  {state.fixture.parts.map((p) => (
                    <ChannelRow key={p.id} state={state} part={p} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
    </Shell>
  );
}

export const VARIANTS = [
  { key: "A", name: "Musikapp", Component: VariantA },
  { key: "B", name: "Mixerbord", Component: VariantB },
  { key: "C", name: "Övningsläge", Component: VariantC },
  // PER-464: variant A with the real alphaTab engine; rendered by AlphaTabPlayer, not here.
  { key: "T", name: "alphaTab", Component: VariantA },
  // PER-463: desktop / tablet width; rendered by DesktopPlayer, not here.
  { key: "D", name: "Bred Musikapp", Component: VariantA },
  { key: "E", name: "Studio", Component: VariantA },
  { key: "F", name: "I appen", Component: VariantA },
] as const;
