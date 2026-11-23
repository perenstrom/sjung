"use client";

import { Pause, Play } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatTime, type Loop, TEMPO_MAX, TEMPO_MIN } from "@/lib/player/player";
import { cn } from "@/lib/utils";

const QUICK_TEMPOS = [60, 75, 90, 100] as const;

/** The large Play/Pause in the dock. */
export function PlayButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? "Pausa" : "Spela"}
      className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow"
    >
      {playing ? <Pause className="size-7" aria-hidden /> : <Play className="size-7 translate-x-0.5" aria-hidden />}
    </button>
  );
}

/** A dock button that opens its own bottom sheet; highlighted while its setting is changed from the default. */
export function DockButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px]",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** The playhead over the whole file, with the repeat passage shaded, and the time on each side. */
export function SeekBar({
  position,
  duration,
  loop,
  onSeek,
}: {
  position: number;
  duration: number;
  loop: Loop | null;
  onSeek: (seconds: number) => void;
}) {
  const percent = (seconds: number) => `${duration > 0 ? (seconds / duration) * 100 : 0}%`;
  return (
    <div className="space-y-1">
      <div className="relative h-6">
        {loop ? (
          <div
            aria-hidden
            className="absolute top-2 h-2 rounded bg-amber-300/70"
            style={{
              left: percent(loop.start),
              width: loop.end === null ? "3px" : percent(loop.end - loop.start),
            }}
          />
        ) : null}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={Math.min(position, duration)}
          disabled={duration === 0}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Position"
          className="absolute inset-0 w-full accent-primary"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

/** The Tempo sheet: a slider and quick buttons. Pitch never changes with tempo. */
export function TempoControls({ tempo, onTempo }: { tempo: number; onTempo: (percent: number) => void }) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="flex justify-between text-sm">
          <span>Tempo</span>
          <span className="text-muted-foreground tabular-nums">{tempo} %</span>
        </span>
        <input
          type="range"
          min={TEMPO_MIN}
          max={TEMPO_MAX}
          step={5}
          value={tempo}
          onChange={(event) => onTempo(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </label>
      <div className="flex gap-1">
        {QUICK_TEMPOS.map((quick) => (
          <Button
            key={quick}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={tempo === quick}
            onClick={() => onTempo(quick)}
            className={cn("flex-1", tempo === quick && "border-primary bg-primary/10")}
          >
            {quick} %
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * The Repetera sheet for a file without a score: "Start här" and "Slut här"
 * mark the passage at the playhead, which then repeats until stopped.
 */
export function RepeatControls({
  loop,
  onMark,
  onStop,
}: {
  loop: Loop | null;
  onMark: () => void;
  onStop: () => void;
}) {
  const marking = loop !== null && loop.end === null;
  const status =
    loop === null
      ? "Sätt start och slut för att repetera ett avsnitt."
      : loop.end === null
        ? `Start ${formatTime(loop.start)}. Sätt slutet där avsnittet slutar.`
        : `Repeterar ${formatTime(loop.start)}–${formatTime(loop.end)}`;

  return (
    <div className="space-y-3">
      <p className="text-sm">{status}</p>
      <div className="flex gap-2">
        <Button type="button" onClick={onMark} className="flex-1">
          {marking ? "Slut här" : "Start här"}
        </Button>
        {loop === null ? null : (
          <Button type="button" variant="outline" onClick={onStop} className="flex-1">
            Sluta repetera
          </Button>
        )}
      </div>
    </div>
  );
}
