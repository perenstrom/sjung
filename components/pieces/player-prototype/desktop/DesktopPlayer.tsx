"use client";
/* eslint-disable react-hooks/refs -- prototype: the score's refs travel inside the Desk object */

// PROTOTYPE (PER-463): three player views for a desktop or tablet-width
// screen, built on the phone's variant A "Musikapp" (PER-458). Notation files
// play through alphaTab (PER-464); audio and MIDI through the fake clock.
//   D  Bred Musikapp – full screen; the phone layout widened: score centred,
//                      one transport row at the bottom, Tempo / Repetera /
//                      Stämmor behind buttons that open popovers (no sheets).
//   E  Studio        – full screen; the score takes all the height, and one
//                      panel on the right holds everything else, always open
//                      (play, seek, tempo, repeat, the whole mixer).
//   F  I appen       – inside the app shell: sidebar and breadcrumb stay; the
//                      Piece's files as tabs; tempo and repeat inline in the
//                      transport row; Stämmor in a drawer from the right.
// Each variant starts with its own way of showing the score (D follows the
// cursor, E turns a page when the cursor leaves the screen, F is one long
// row); the amber strip at the bottom overrides it in any variant.
// The phone variants (A–C, PER-458) and the alphaTab check (T, PER-464) were
// removed once decided; they stay in this branch's history.

import { Keyboard, Music, PanelRightClose, PanelRightOpen, Repeat, SlidersHorizontal, Timer, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";

import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";
import { cn } from "@/lib/utils";

import type { Options } from "../alphatab/useAlphaTabPlayer";
import { ChannelRow, MyPartPicker, PlayButton, type PlayerContext, PresetButtons, TempoSlider } from "../controls";
import { FIXTURES, FORMAT_LABEL, type PlayableFixture } from "../fixtures";
import { formatTime } from "../usePlayerState";
import { type Desk, SHORTCUTS, useAlphaTabDesk, useFakeDesk, useShortcuts } from "./useDesk";

export const DESKTOP_VARIANTS = [
  { key: "D", name: "Bred Musikapp" },
  { key: "E", name: "Studio" },
  { key: "F", name: "I appen" },
] as const;
export type DesktopKey = (typeof DESKTOP_VARIANTS)[number]["key"];

type ScoreMode = "follow" | "page" | "smooth" | "row";
const DEFAULT_SCORE: Record<DesktopKey, { mode: ScoreMode; scale: number }> = {
  D: { mode: "follow", scale: 1 },
  E: { mode: "page", scale: 0.9 },
  F: { mode: "row", scale: 1 },
};

type Props = {
  variant: DesktopKey;
  fixture: PlayableFixture;
  ctx: PlayerContext;
  trail: AppBreadcrumbStaticTrail;
};

export function DesktopPlayer(props: Props) {
  const params = useSearchParams();
  const d = DEFAULT_SCORE[props.variant];
  const mode = (params.get("score") as ScoreMode | null) ?? d.mode;
  const options: Options = {
    scale: Number(params.get("scale") ?? d.scale),
    layout: mode === "row" ? "horizontal" : "page",
    scroll: mode === "page" ? "offscreen" : mode === "smooth" ? "smooth" : "continuous",
    barsPerRow: Number(params.get("bars") ?? -1),
  };
  return (
    <>
      {props.fixture.url ? (
        <AlphaTabDesk {...props} url={props.fixture.url} options={options} />
      ) : (
        <FakeDesk {...props} />
      )}
      <PrototypeStrip {...props} mode={mode} options={options} />
    </>
  );
}

function AlphaTabDesk(props: Props & { url: string; options: Options }) {
  const desk = useAlphaTabDesk(props.fixture, props.url, props.options);
  return <Layout {...props} desk={desk} />;
}

function FakeDesk(props: Props) {
  const desk = useFakeDesk(props.fixture);
  return <Layout {...props} desk={desk} />;
}

function Layout(props: Props & { desk: Desk }) {
  const keys = useShortcuts(props.desk);
  const View = { D: VariantD, E: VariantE, F: VariantF }[props.variant];
  return (
    <>
      <style>{ALPHATAB_CSS}</style>
      <View {...props} keys={keys} />
      <ShortcutHelp open={keys.helpOpen} onOpenChange={keys.setHelpOpen} />
    </>
  );
}

type ViewProps = Props & { desk: Desk; keys: ReturnType<typeof useShortcuts> };

// ---------------------------------------------------------------- D

function VariantD({ ctx, desk, keys }: ViewProps) {
  return (
    <FullScreen>
      <DeskHeader ctx={ctx} desk={desk} onHelp={() => keys.setHelpOpen(true)} />
      <ScoreArea desk={desk} hud={keys.hud} centered />
      <footer className="flex items-center gap-4 border-t bg-background px-6 py-3">
        <Play desk={desk} size="md" />
        <DeskSeek desk={desk} className="min-w-0 flex-1" />
        <div className="flex shrink-0 items-center gap-1">
          <PopoverButton
            icon={<Timer className="size-4" />}
            label={`${desk.tempo} %`}
            active={desk.tempo !== 100}
            title="Tempo"
            shortcut="− / +"
          >
            <TempoPanel desk={desk} />
          </PopoverButton>
          <PopoverButton
            icon={<Repeat className="size-4" />}
            label={desk.loop?.b ? `${desk.loop.a}–${desk.loop.b.replace("takt ", "")}` : "Repetera"}
            active={!!desk.loop?.b}
            title="Repetera"
            shortcut="A / B / Esc"
          >
            <RepeatPanel desk={desk} />
          </PopoverButton>
          {desk.parts.length > 0 ? (
            <PopoverButton
              icon={<SlidersHorizontal className="size-4" />}
              label="Stämmor"
              active={mixChanged(desk)}
              title="Stämmor"
              shortcut="1–9 / 0"
              wide
            >
              <Mixer desk={desk} />
            </PopoverButton>
          ) : null}
        </div>
      </footer>
    </FullScreen>
  );
}

function PopoverButton({
  icon,
  label,
  active,
  title,
  shortcut,
  wide,
  children,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  title: string;
  shortcut: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${title} (${shortcut})`}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted data-[state=open]:bg-muted",
            active && "border-primary text-primary"
          )}
        >
          {icon}
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className={cn("space-y-3", wide ? "w-[26rem]" : "w-80")}>
        <p className="flex items-baseline justify-between text-sm font-medium">
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            <Kbd>{shortcut}</Kbd>
          </span>
        </p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------- E

function VariantE({ ctx, desk, keys }: ViewProps) {
  const [open, setOpen] = useState(true);
  return (
    <FullScreen>
      <DeskHeader ctx={ctx} desk={desk} onHelp={() => keys.setHelpOpen(true)}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          {open ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          {open ? "Dölj reglage" : "Visa reglage"}
        </button>
      </DeskHeader>
      <div className="flex min-h-0 flex-1">
        <ScoreArea desk={desk} hud={keys.hud} />
        {open ? (
          <aside className="flex w-[22rem] shrink-0 flex-col overflow-y-auto border-l bg-background">
            <section className="space-y-3 border-b p-4">
              <div className="flex items-center gap-3">
                <Play desk={desk} size="lg" />
                <div className="min-w-0 flex-1 text-sm tabular-nums">
                  <p className="text-2xl font-medium">{formatTime(desk.position)}</p>
                  <p className="text-muted-foreground">
                    {desk.bar != null ? `takt ${desk.bar} · ` : ""}av {formatTime(desk.duration)}
                  </p>
                </div>
              </div>
              <DeskSeek desk={desk} hideTimes />
            </section>
            <PanelSection title="Tempo" shortcut="− / +">
              <TempoPanel desk={desk} />
            </PanelSection>
            <PanelSection title="Repetera" shortcut="A / B / Esc">
              <RepeatPanel desk={desk} />
            </PanelSection>
            {desk.parts.length > 0 ? (
              <PanelSection title="Stämmor" shortcut="1–9 / 0">
                <Mixer desk={desk} />
              </PanelSection>
            ) : null}
          </aside>
        ) : (
          <aside className="flex w-16 shrink-0 flex-col items-center gap-3 border-l py-4">
            <Play desk={desk} size="md" />
            <span className="text-xs tabular-nums text-muted-foreground">{formatTime(desk.position)}</span>
            <RailButton onClick={() => setOpen(true)} icon={<Timer className="size-5" />} label={`${desk.tempo}%`} active={desk.tempo !== 100} />
            <RailButton onClick={() => setOpen(true)} icon={<Repeat className="size-5" />} label="A–B" active={!!desk.loop?.b} />
            {desk.parts.length > 0 ? (
              <RailButton onClick={() => setOpen(true)} icon={<SlidersHorizontal className="size-5" />} label="Mix" active={mixChanged(desk)} />
            ) : null}
          </aside>
        )}
      </div>
    </FullScreen>
  );
}

function PanelSection({ title, shortcut, children }: { title: string; shortcut: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b p-4">
      <h2 className="flex items-baseline justify-between text-sm font-medium">
        {title}
        <Kbd>{shortcut}</Kbd>
      </h2>
      {children}
    </section>
  );
}

function RailButton({ onClick, icon, label, active }: { onClick: () => void; icon: ReactNode; label: string; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-[11px]", active ? "text-primary" : "text-muted-foreground")}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------- F

function VariantF({ ctx, desk, keys, trail }: ViewProps) {
  const [mixOpen, setMixOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <BreadcrumbRegistrar trail={trail} />
      {/* Fill the app shell's content area, cancelling its padding. 4rem header, 1.75rem prototype strip. */}
      <div className="-m-4 flex flex-col md:-m-8 md:-ml-12" style={{ height: "calc(100svh - 4rem - 1.75rem)" }}>
        <div className="flex items-end gap-4 border-b px-6 pt-3">
          <div className="min-w-0 pb-2">
            <h1 className="truncate text-xl font-semibold">{ctx.pieceName}</h1>
          </div>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Övningsfiler">
            {FIXTURES.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => router.replace(ctx.hrefFor(f.key), { scroll: false })}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2 text-sm",
                  f.key === desk.fixture.key
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="max-w-48 truncate">{f.fileName}</span>
                <span className="rounded border px-1 text-[10px] uppercase">{FORMAT_LABEL[f.format]}</span>
              </button>
            ))}
          </nav>
          <HelpButton onClick={() => keys.setHelpOpen(true)} className="mb-1.5" />
        </div>
        <ScoreArea desk={desk} hud={keys.hud} />
        <footer className="flex items-center gap-4 border-t bg-background px-6 py-2.5">
          <Play desk={desk} size="md" />
          <DeskSeek desk={desk} className="min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-1 rounded-lg border px-1" title="Tempo (− / +)">
            <button type="button" className="size-8 rounded text-lg hover:bg-muted" onClick={() => desk.setTempo(desk.tempo - 5)}>
              −
            </button>
            <span className="w-24 text-center text-sm tabular-nums">
              <Timer className="mr-1 inline size-3.5 align-[-2px]" />
              {desk.tempo} %
            </span>
            <button type="button" className="size-8 rounded text-lg hover:bg-muted" onClick={() => desk.setTempo(desk.tempo + 5)}>
              +
            </button>
          </div>
          <div
            className={cn(
              "flex h-10 shrink-0 items-center gap-1 rounded-lg border pl-2 text-sm",
              desk.loop?.b ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40" : "pr-1"
            )}
            title="Repetera (A / B / Esc)"
          >
            <Repeat className={cn("size-4", desk.loop?.b ? "text-amber-600" : "text-muted-foreground")} />
            {desk.loop ? (
              <>
                <span className="tabular-nums">
                  {desk.loop.a}
                  {desk.loop.b ? `–${desk.loop.b.replace("takt ", "")}` : " → B?"}
                </span>
                <button type="button" onClick={desk.clearLoop} aria-label="Sluta repetera" className="rounded p-1.5 hover:bg-muted">
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={desk.markA} className="rounded px-2 py-1 hover:bg-muted">
                  Från här
                </button>
              </>
            )}
            {desk.loop && !desk.loop.b ? (
              <button type="button" onClick={desk.markB} className="rounded px-2 py-1 hover:bg-muted">
                Till här
              </button>
            ) : null}
          </div>
          {desk.parts.length > 0 ? (
            <button
              type="button"
              onClick={() => setMixOpen(true)}
              title="Stämmor (1–9 / 0)"
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted",
                mixChanged(desk) && "border-primary text-primary"
              )}
            >
              <SlidersHorizontal className="size-4" /> Stämmor
            </button>
          ) : null}
        </footer>
      </div>
      <Sheet open={mixOpen} onOpenChange={setMixOpen}>
        <SheetContent side="right" className="w-[26rem] sm:max-w-[26rem]">
          <SheetHeader className="pb-0">
            <SheetTitle>Stämmor</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <Mixer desk={desk} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- shared

function FullScreen({ children }: { children: ReactNode }) {
  // Over the app shell, above the prototype strip (1.75rem) at the bottom.
  return <div className="fixed inset-x-0 top-0 bottom-7 z-40 flex flex-col bg-background">{children}</div>;
}

function DeskHeader({ ctx, desk, onHelp, children }: { ctx: PlayerContext; desk: Desk; onHelp: () => void; children?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <Link href={ctx.backHref} aria-label="Stäng spelaren" title="Stäng" className="rounded-full p-2 hover:bg-muted">
        <X className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{ctx.pieceName}</p>
        <select
          value={desk.fixture.key}
          onChange={(e) => router.replace(ctx.hrefFor(e.target.value), { scroll: false })}
          className="max-w-full truncate bg-transparent text-sm text-muted-foreground"
        >
          {FIXTURES.map((f) => (
            <option key={f.key} value={f.key}>
              {f.fileName}
            </option>
          ))}
        </select>
      </div>
      <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {FORMAT_LABEL[desk.fixture.format]}
      </span>
      {children}
      <HelpButton onClick={onHelp} />
    </header>
  );
}

function HelpButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Kortkommandon (?)"
      className={cn("flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted", className)}
    >
      <Keyboard className="size-4" />
      <Kbd>?</Kbd>
    </button>
  );
}

function ScoreArea({ desk, hud, centered }: { desk: Desk; hud: string | null; centered?: boolean }) {
  return (
    <main
      ref={desk.scrollRef}
      className={cn("relative min-h-0 min-w-0 flex-1 overflow-auto", desk.engine === "alphatab" ? "bg-white text-black" : "bg-muted/30")}
    >
      {desk.engine === "alphatab" ? (
        <>
          {desk.status ? (
            <div className="pointer-events-none absolute inset-x-0 top-8 z-10 text-center text-sm text-neutral-500">{desk.status}</div>
          ) : null}
          <div ref={desk.scoreRef} className={cn(centered && "mx-auto max-w-[72rem]")} />
        </>
      ) : (
        <NoScore desk={desk} />
      )}
      {hud ? (
        <div className="pointer-events-none sticky bottom-4 z-20 mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
          {hud}
        </div>
      ) : null}
    </main>
  );
}

/** Audio and MIDI: no score, so the wide screen shows the whole file as a strip you can click. */
function NoScore({ desk }: { desk: Desk }) {
  const n = 160;
  const progress = desk.duration ? desk.position / desk.duration : 0;
  const midi = desk.fixture.format === "midi";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-10">
      <div className="text-center">
        <Music className="mx-auto mb-2 size-10 text-muted-foreground/50" />
        <p className="font-medium">{desk.fixture.fileName}</p>
        <p className="text-sm text-muted-foreground">
          {midi
            ? "MIDI-filer har inga noter att visa. Finns noterna som MusicXML eller MuseScore, öppna den filen."
            : "Ljudfil – inga noter att visa."}
        </p>
      </div>
      <div
        className="relative flex h-32 w-full max-w-5xl cursor-pointer items-center gap-px"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          desk.seek(((e.clientX - r.left) / r.width) * desk.duration);
        }}
      >
        {desk.loopFrac ? (
          <div
            className="absolute inset-y-0 rounded bg-amber-300/40"
            style={{
              left: `${desk.loopFrac.from * 100}%`,
              width: desk.loopFrac.to === null ? "3px" : `${(desk.loopFrac.to - desk.loopFrac.from) * 100}%`,
            }}
          />
        ) : null}
        {Array.from({ length: n }, (_, i) => {
          const h = midi ? 30 + 25 * Math.abs(Math.sin(i * 0.7)) : 15 + 80 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11) + 0.15 * Math.sin(i * 2.3));
          return (
            <div
              key={i}
              className={cn("relative flex-1 rounded-sm", i / n < progress ? "bg-primary" : "bg-primary/25")}
              style={{ height: `${Math.round(Math.min(100, h))}%` }}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Klicka i remsan för att hoppa dit · A och B sätter start och slut för en repetition</p>
    </div>
  );
}

function Play({ desk, size }: { desk: Desk; size: "md" | "lg" }) {
  return (
    <div className={cn(!desk.ready && "pointer-events-none opacity-40")} title="Spela / pausa (mellanslag)">
      <PlayButton state={desk.compat} size={size} />
    </div>
  );
}

function DeskSeek({ desk, className, hideTimes }: { desk: Desk; className?: string; hideTimes?: boolean }) {
  const f = desk.loopFrac;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {!hideTimes ? (
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(desk.position)}
          {desk.bar != null ? ` · takt ${desk.bar}` : ""}
        </span>
      ) : null}
      <div className="relative h-6 min-w-0 flex-1">
        {f ? (
          <div
            className="absolute top-2 h-2 rounded bg-amber-300/80"
            style={{ left: `${f.from * 100}%`, width: f.to === null ? "3px" : `${(f.to - f.from) * 100}%` }}
          />
        ) : null}
        <input
          type="range"
          tabIndex={-1}
          min={0}
          max={desk.duration || 1}
          step={0.1}
          value={desk.position}
          onChange={(e) => desk.seek(Number(e.target.value))}
          onPointerUp={(e) => e.currentTarget.blur()}
          aria-label="Position"
          className="absolute inset-0 w-full accent-primary"
        />
      </div>
      {!hideTimes ? <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(desk.duration)}</span> : null}
    </div>
  );
}

function TempoPanel({ desk }: { desk: Desk }) {
  return <TempoSlider state={{ ...desk.compat, tempo: desk.tempo, setTempo: desk.setTempo } as typeof desk.compat} />;
}

function RepeatPanel({ desk }: { desk: Desk }) {
  const scored = desk.engine === "alphatab";
  const text = !desk.loop
    ? scored
      ? "Klicka på en takt i noterna och sedan på sluttakten – eller använd knapparna medan det spelar."
      : "Sätt start och slut medan det spelar."
    : desk.loop.b === null
      ? `Start: ${desk.loop.a}. Sätt slutet.`
      : `Repeterar ${desk.loop.a}–${desk.loop.b.replace("takt ", "")}`;
  return (
    <div className="space-y-2 text-sm">
      <p className={cn(desk.loop?.b ? "text-foreground" : "text-muted-foreground")}>{text}</p>
      <div className="flex gap-1">
        <button type="button" onClick={desk.markA} className="flex-1 rounded border px-2 py-1.5 text-xs hover:bg-muted">
          Start här <Kbd>A</Kbd>
        </button>
        <button type="button" onClick={desk.markB} className="flex-1 rounded border px-2 py-1.5 text-xs hover:bg-muted">
          Slut här <Kbd>B</Kbd>
        </button>
        <button
          type="button"
          onClick={desk.clearLoop}
          disabled={!desk.loop}
          className="rounded border px-2 py-1.5 text-xs hover:bg-muted disabled:opacity-40"
        >
          Rensa <Kbd>Esc</Kbd>
        </button>
      </div>
    </div>
  );
}

function Mixer({ desk }: { desk: Desk }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Min stämma</p>
        <MyPartPicker state={desk.compat} />
        <PresetButtons state={desk.compat} />
      </div>
      <div className="divide-y border-t">
        {desk.parts.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <Kbd className="w-5 text-center">{i < 9 ? i + 1 : ""}</Kbd>
            <div className="min-w-0 flex-1">
              <ChannelRow state={desk.compat} part={p} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function mixChanged(desk: Desk) {
  const c = desk.compat;
  return c.preset !== "all" || Object.values(c.channels).some((ch) => ch.muted || ch.solo || ch.volume !== 80);
}

function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground", className)}>{children}</kbd>
  );
}

function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kortkommandon</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {SHORTCUTS.map((s) => (
              <tr key={s.what}>
                <td className="py-1.5 pr-4 whitespace-nowrap">
                  {s.keys.map((k) => (
                    <Kbd key={k} className="mr-1 text-xs">
                      {k}
                    </Kbd>
                  ))}
                </td>
                <td className="py-1.5">{s.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- prototype strip

function PrototypeStrip({ variant, fixture, mode, options }: Props & { mode: ScoreMode; options: Options }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={cn("shrink-0 rounded-full border border-black/20 px-2 py-0.5", on && "bg-black text-white")}
    >
      {label}
    </button>
  );
  const scored = !!fixture.url;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex h-7 items-center gap-1.5 overflow-x-auto bg-amber-300 px-2 text-[11px] text-black">
      <PrototypeSwitcher variants={DESKTOP_VARIANTS} current={variant} inline arrowKeys={false} />
      {scored ? (
        <>
          <span className="ml-2 shrink-0 font-medium">Noter:</span>
          {(
            [
              ["follow", "Följ markören"],
              ["page", "Bläddra"],
              ["smooth", "Rulla mjukt"],
              ["row", "En rad"],
            ] as const
          ).map(([m, label]) => chip(mode === m, label, () => set("score", m)))}
          <span className="ml-2 shrink-0 font-medium">Takter/rad:</span>
          {[-1, 2, 4, 6, 8].map((n) =>
            chip(options.barsPerRow === n, n === -1 ? "auto" : String(n), () => set("bars", n === -1 ? null : String(n)))
          )}
          <span className="ml-2 flex shrink-0 items-center rounded-full border border-black/20">
            <button type="button" className="px-2" onClick={() => set("scale", (options.scale - 0.1).toFixed(1))}>
              −
            </button>
            <span className="tabular-nums">{Math.round(options.scale * 100)}%</span>
            <button type="button" className="px-2" onClick={() => set("scale", (options.scale + 0.1).toFixed(1))}>
              +
            </button>
          </span>
        </>
      ) : null}
      <span className="ml-2 truncate opacity-70">PROTOTYP · {fixture.note}</span>
    </div>
  );
}

// alphaTab's cursor and selection need styles from the host page.
const ALPHATAB_CSS = `
.at-cursor-bar { background: rgb(255 200 0 / 0.18); }
.at-cursor-beat { background: rgb(37 99 235 / 0.85); width: 3px; }
.at-selection div { background: rgb(245 158 11 / 0.25); }
.at-highlight * { fill: rgb(37 99 235); stroke: rgb(37 99 235); }
`;
