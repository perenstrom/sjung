"use client";

import { Keyboard, Music, Repeat, Timer } from "lucide-react";
import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_TEMPO,
  formatTime,
  isRepeating,
  type Loop,
  markLoop,
  type Player,
  type PlayerSnapshot,
} from "@/lib/player/player";
import { LISTED_SHORTCUTS } from "@/lib/player/shortcuts";
import { cn } from "@/lib/utils";

import {
  NoScoreNote,
  passageStyle,
  PlayButton,
  type PlayerPanel,
  RepeatControls,
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
      className={cn("items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted", className)}
    >
      <Keyboard className="size-4" aria-hidden />
      <Kbd>?</Kbd>
    </button>
  );
}

/**
 * A file without a score, at desktop width: its name, that it has no score,
 * and the whole file as a waveform strip to click and seek in.
 */
export function NoScoreStrip({
  name,
  snapshot,
  peaks,
  onSeek,
}: {
  name: string;
  snapshot: PlayerSnapshot;
  peaks: readonly number[] | null;
  onSeek: (seconds: number) => void;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 px-10">
      <div className="space-y-2 text-center">
        <Music className="mx-auto size-10 text-muted-foreground/50" aria-hidden />
        <p className="font-medium break-words">{name}</p>
        <NoScoreNote status={snapshot.status} />
      </div>
      <WaveformStrip
        peaks={peaks}
        position={snapshot.position}
        duration={snapshot.duration}
        loop={snapshot.loop}
        onSeek={onSeek}
      />
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
  loop,
  onSeek,
}: {
  peaks: readonly number[] | null;
  position: number;
  duration: number;
  loop: Loop | null;
  onSeek: (seconds: number) => void;
}) {
  const heights = peaks ?? Array.from({ length: WAVEFORM_BARS }, () => 0);
  const progress = duration > 0 ? position / duration : 0;
  return (
    <div
      data-waveform
      aria-hidden
      className="relative flex h-32 w-full max-w-5xl cursor-pointer items-center gap-px"
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        onSeek(((event.clientX - box.left) / box.width) * duration);
      }}
    >
      {loop ? (
        <div data-passage className="absolute inset-y-0 rounded bg-amber-300/40" style={passageStyle(loop, duration)} />
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

/**
 * The transport row at the bottom: Play, the time, the seek bar, the length,
 * then Tempo and Repetera, each opening a popover above its button.
 */
export function DesktopTransport({
  snapshot,
  player,
  panel,
  onPanel,
}: {
  snapshot: PlayerSnapshot;
  player: Player | null;
  panel: PlayerPanel | null;
  onPanel: (panel: PlayerPanel | null) => void;
}) {
  const { loop } = snapshot;
  const panelProps = (key: PlayerPanel) => ({
    open: panel === key,
    onOpenChange: (open: boolean) => onPanel(open ? key : null),
  });

  return (
    <footer data-layout="desktop" className="hidden items-center gap-4 border-t bg-background px-6 py-3 md:flex">
      <PlayButton playing={snapshot.playing} player={player} />
      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {formatTime(snapshot.position)}
      </span>
      <SeekTrack
        position={snapshot.position}
        duration={snapshot.duration}
        loop={loop}
        onSeek={(seconds) => player?.seek(seconds)}
        className="min-w-0 flex-1"
      />
      <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(snapshot.duration)}</span>
      <div className="flex shrink-0 items-center gap-1">
        <PanelButton
          {...panelProps("tempo")}
          icon={<Timer className="size-4" aria-hidden />}
          label={`${snapshot.tempo} %`}
          active={snapshot.tempo !== DEFAULT_TEMPO}
          title="Tempo"
          shortcut="− / +"
        >
          <TempoControls tempo={snapshot.tempo} onTempo={(percent) => player?.setTempo(percent)} />
        </PanelButton>
        <PanelButton
          {...panelProps("repeat")}
          icon={<Repeat className="size-4" aria-hidden />}
          label={isRepeating(loop) ? `${formatTime(loop.start)}–${formatTime(loop.end)}` : "Repetera"}
          active={isRepeating(loop)}
          title="Repetera"
          shortcut="A / B / Esc"
        >
          <RepeatControls
            loop={loop}
            onMark={() => player?.setLoop(markLoop(loop, snapshot.position))}
            onStop={() => player?.setLoop(null)}
          />
        </PanelButton>
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
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  label: string;
  active: boolean;
  title: string;
  shortcut: string;
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
            active && "border-primary text-primary"
          )}
        >
          {icon}
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 space-y-3">
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
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Kortkommandon</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {LISTED_SHORTCUTS.map(({ keys, what }) => (
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

function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground", className)}>
      {children}
    </kbd>
  );
}
