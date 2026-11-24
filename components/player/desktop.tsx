"use client";

import { Keyboard, Music, Repeat, SlidersHorizontal, Timer } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Passage } from "@/lib/player/player";
import type { PlayerControlsView } from "@/lib/player/player-controls";
import { listedShortcuts } from "@/lib/player/shortcuts";
import { cn } from "@/lib/utils";

import {
  Kbd,
  type NoScoreEngine,
  NoScoreNote,
  PartsControls,
  passageStyle,
  PlayButton,
  type PlayerPanel,
  RepeatControls,
  type RunCommand,
  SeekTrack,
  TempoControls,
} from "./controls";

/** How many bars the waveform strip has. */
export const WAVEFORM_BARS = 160;

/** The header button that lists the shortcuts, as ? does. */
export function ShortcutsButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Kortkommandon"
      title="Kortkommandon (?)"
      className={cn(
        "items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      <Keyboard className="size-4" aria-hidden />
      <Kbd>?</Kbd>
    </button>
  );
}

/**
 * A file without a score, at desktop width: its name, that it has no score,
 * and the whole file as a strip to click and seek in: a waveform for audio,
 * a plain bar otherwise.
 */
export function NoScoreStrip({
  name,
  engine,
  view,
  peaks,
  onSeek,
}: {
  name: string;
  engine: NoScoreEngine;
  view: PlayerControlsView;
  peaks: readonly number[] | null;
  onSeek: (seconds: number) => void;
}) {
  const { playhead, passage } = view;
  const strip = { position: playhead.position, duration: playhead.duration, passage: passage.range, onSeek };
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 px-10">
      <div className="space-y-2 text-center">
        <Music className="mx-auto size-10 text-muted-foreground/50" aria-hidden />
        <p className="font-medium break-words">{name}</p>
        <NoScoreNote status={view.status} engine={engine} />
      </div>
      {engine === "audio" ? <WaveformStrip peaks={peaks} {...strip} /> : <PlainStrip {...strip} />}
      <p className="text-xs text-muted-foreground">
        Klicka i remsan för att hoppa dit · <Kbd>A</Kbd> och <Kbd>B</Kbd> sätter start och slut för en repetition
      </p>
    </div>
  );
}

/**
 * The waveform, played up to the playhead, with the repeat passage shaded.
 * Flat until the file is decoded, or if it can't be. A mouse shortcut: the
 * seek bar and the arrow keys do the same from the keyboard.
 */
function WaveformStrip({
  peaks,
  position,
  duration,
  passage,
  onSeek,
}: StripProps & { peaks: readonly number[] | null }) {
  const heights = peaks ?? Array.from({ length: WAVEFORM_BARS }, () => 0);
  const progress = duration > 0 ? position / duration : 0;
  return (
    <div
      data-waveform
      aria-hidden
      className="relative flex h-32 w-full max-w-5xl cursor-pointer items-center gap-px"
      onClick={seekOnClick(duration, onSeek)}
    >
      {passage ? (
        <div
          data-passage
          className="absolute inset-y-0 rounded bg-amber-300/40"
          style={passageStyle(passage, duration)}
        />
      ) : null}
      {heights.map((height, index) => {
        const played = index / heights.length < progress;
        return (
          <div
            key={index}
            data-bar={played ? "played" : "ahead"}
            className={cn("relative flex-1 rounded-sm", played ? "bg-primary" : "bg-primary/25")}
            style={{ height: `${Math.max(3, Math.round(height * 100))}%` }}
          />
        );
      })}
    </div>
  );
}

type StripProps = { position: number; duration: number; passage: Passage | null; onSeek: (seconds: number) => void };

/** Seeks to where the strip was clicked, as a share of the whole file. */
function seekOnClick(duration: number, onSeek: (seconds: number) => void) {
  return (event: MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onSeek(((event.clientX - box.left) / box.width) * duration);
  };
}

/**
 * The whole file as a plain bar, played up to the playhead, with the repeat
 * passage shaded. A mouse shortcut, as the waveform is.
 */
function PlainStrip({ position, duration, passage, onSeek }: StripProps) {
  const played = duration > 0 ? (Math.min(position, duration) / duration) * 100 : 0;
  return (
    <div
      data-strip
      aria-hidden
      className="relative h-4 w-full max-w-5xl cursor-pointer overflow-hidden rounded-full bg-primary/25"
      onClick={seekOnClick(duration, onSeek)}
    >
      {passage ? (
        <div data-passage className="absolute inset-y-0 bg-amber-300/70" style={passageStyle(passage, duration)} />
      ) : null}
      <div data-played className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${played}%` }} />
    </div>
  );
}

/**
 * The transport row at the bottom: Play, the time, the seek bar, the length,
 * then Tempo, Repetera and, for a file with parts, Stämmor, each opening a
 * popover above its button.
 */
export function DesktopTransport({
  view,
  run,
  panel,
  onPanel,
}: {
  view: PlayerControlsView;
  run: RunCommand;
  panel: PlayerPanel | null;
  onPanel: (panel: PlayerPanel | null) => void;
}) {
  const { playhead, tempo, passage, parts } = view;
  const panelProps = (key: PlayerPanel) => ({
    open: panel === key,
    onOpenChange: (open: boolean) => onPanel(open ? key : null),
  });

  return (
    <footer data-layout="desktop" className="hidden items-center gap-4 border-t bg-background px-6 py-3 md:flex">
      <PlayButton playing={view.playing} run={run} />
      <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        <span className="inline-block w-12">{playhead.time}</span>
        {playhead.bar === null ? null : <span className="ml-2 inline-block min-w-14 text-left">{playhead.bar}</span>}
      </span>
      <SeekTrack
        position={playhead.position}
        duration={playhead.duration}
        passage={passage.range}
        onSeek={(seconds) => run({ type: "seek", seconds })}
        className="min-w-0 flex-1"
      />
      <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">{playhead.length}</span>
      <div className="flex shrink-0 items-center gap-1">
        <PanelButton
          {...panelProps("tempo")}
          icon={<Timer className="size-4" aria-hidden />}
          label={`${tempo.percent} %`}
          active={tempo.changed}
          title="Tempo"
          shortcut="− / +"
        >
          <TempoControls tempo={tempo.percent} onTempo={(percent) => run({ type: "setTempo", percent })} />
        </PanelButton>
        <PanelButton
          {...panelProps("repeat")}
          icon={<Repeat className="size-4" aria-hidden />}
          label={passage.label ?? "Repetera"}
          active={passage.repeating}
          title="Repetera"
          shortcut="A / B / Esc"
        >
          <RepeatControls passage={passage} run={run} />
        </PanelButton>
        {parts.shown ? (
          <PanelButton
            {...panelProps("parts")}
            icon={<SlidersHorizontal className="size-4" aria-hidden />}
            label="Stämmor"
            active={parts.changed}
            title="Stämmor"
            shortcut="1–9 / 0"
            wide
          >
            <PartsControls parts={parts} run={run} numbered />
          </PanelButton>
        ) : null}
      </div>
    </footer>
  );
}

/** A transport button that opens its popover above it; highlighted while its setting is changed from the default. */
function PanelButton({
  open,
  onOpenChange,
  icon,
  label,
  active,
  title,
  shortcut,
  wide = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  label: string;
  active: boolean;
  title: string;
  shortcut: string;
  /** Room for a row per part. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${title} (${shortcut})`}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted data-[state=open]:bg-muted",
            active && "border-primary text-primary",
          )}
        >
          {icon}
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className={cn("space-y-3", wide ? "max-h-[70dvh] w-[26rem] overflow-y-auto" : "w-80")}
      >
        <p className="flex items-baseline justify-between text-sm font-medium">
          {title}
          <Kbd>{shortcut}</Kbd>
        </p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** The listed keyboard shortcuts, opened with ? or the header button. */
export function ShortcutsDialog({
  open,
  onOpenChange,
  hasBars,
  hasParts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasBars: boolean;
  hasParts: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Kortkommandon</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {listedShortcuts({ hasBars, hasParts }).map(({ keys, what }) => (
              <tr key={what}>
                <td className="py-1.5 pr-4 whitespace-nowrap">
                  {keys.map((key) => (
                    <Kbd key={key} className="mr-1 text-xs">
                      {key}
                    </Kbd>
                  ))}
                </td>
                <td className="py-1.5">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

/** The short message saying what a key just did. */
export function ShortcutHud({ message }: { message: string | null }) {
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-36 z-50 flex justify-center md:bottom-24">
      {message ? (
        <span className="rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">{message}</span>
      ) : null}
    </div>
  );
}
