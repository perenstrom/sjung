"use client";

import { Pause, Play } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { PlayerEngine } from "@/lib/file-formats";
import { MIX_PRESETS } from "@/lib/player/mix";
import { type Passage, type PlayerSnapshot, type PlayerSound, TEMPO_MAX, TEMPO_MIN } from "@/lib/player/player";
import { type PartView, type PlayerCommand, type PlayerControlsView, TEMPO_STEP } from "@/lib/player/player-controls";
import { cn } from "@/lib/utils";

const QUICK_TEMPOS = [60, 75, 90, 100] as const;

/** The Tempo, Repetera and Stämmor controls: a bottom sheet each on a phone, a popover each on desktop. */
export type PlayerPanel = "tempo" | "repeat" | "parts";

/** Asks the player's controls to do `command`; does nothing until the engine is ready. */
export type RunCommand = (command: PlayerCommand) => void;

/** Play/Pause: pauses while playing, plays otherwise. */
export function PlayButton({ playing, run }: { playing: boolean; run: RunCommand }) {
  return (
    <button
      type="button"
      onClick={() => run({ type: "togglePlay" })}
      aria-label={playing ? "Pausa" : "Spela"}
      className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow"
    >
      {playing ? <Pause className="size-7" aria-hidden /> : <Play className="size-7 translate-x-0.5" aria-hidden />}
    </button>
  );
}

/** The engines that play a file without a score to draw. */
export type NoScoreEngine = Exclude<PlayerEngine, "notation">;

const NO_SCORE: Record<NoScoreEngine, string> = {
  audio: "Ljudfil – inga noter att visa.",
  midi: "MIDI-fil – inga noter att visa.",
};

/** What shows in place of a score for a file without one, or that it can't be played. */
export function NoScoreNote({ status, engine }: { status: PlayerSnapshot["status"]; engine: NoScoreEngine }) {
  return status === "error" ? (
    <p className="text-sm text-destructive">Filen kunde inte spelas upp.</p>
  ) : (
    <p className="text-sm text-muted-foreground">{NO_SCORE[engine]}</p>
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
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * The playhead over the whole file, with the repeat passage shaded, the time
 * (and bar, if the file has bars) on one side and the length on the other.
 */
export function SeekBar({
  playhead,
  passage,
  onSeek,
}: {
  playhead: PlayerControlsView["playhead"];
  passage: Passage | null;
  onSeek: (seconds: number) => void;
}) {
  return (
    <div className="space-y-1">
      <SeekTrack position={playhead.position} duration={playhead.duration} passage={passage} onSeek={onSeek} />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{playhead.label}</span>
        <span>{playhead.length}</span>
      </div>
    </div>
  );
}

/** The slider over the whole file, with the repeat passage shaded behind it. */
export function SeekTrack({
  position,
  duration,
  passage,
  onSeek,
  className,
}: {
  position: number;
  duration: number;
  passage: Passage | null;
  onSeek: (seconds: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative h-6", className)}>
      {passage ? (
        <div
          aria-hidden
          className="absolute top-2 h-2 rounded bg-amber-300/70"
          style={passageStyle(passage, duration)}
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
        // After a seek with the pointer, the arrow keys and Home go back to the player's shortcuts.
        onPointerUp={(event) => event.currentTarget.blur()}
        aria-label="Position"
        className="absolute inset-0 w-full accent-primary"
      />
    </div>
  );
}

/** Where the repeat passage sits along the whole file; a thin mark while only its start is set. */
export function passageStyle(passage: Passage, duration: number) {
  const percent = (seconds: number) => `${duration > 0 ? (seconds / duration) * 100 : 0}%`;
  return { left: percent(passage.start), width: passage.end === null ? "3px" : percent(passage.end - passage.start) };
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
          step={TEMPO_STEP}
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
 * The Repetera sheet. Where the score takes taps, a tap on a bar starts the
 * passage and a tap on another ends it. Otherwise "Start här" and "Slut här"
 * mark it at the playhead as A and B do: by whole bars in a file with bars.
 * Either way it then repeats until stopped.
 */
export function RepeatControls({ passage, run }: { passage: PlayerControlsView["passage"]; run: RunCommand }) {
  return (
    <div className="space-y-3">
      <p className="text-sm">{passage.status}</p>
      <div className="flex gap-2">
        {passage.markButton === null ? null : (
          <Button
            type="button"
            onClick={() => run({ type: passage.marking ? "markEnd" : "markStart" })}
            className="flex-1"
          >
            {passage.markButton}
          </Button>
        )}
        {passage.range === null ? null : (
          <Button type="button" variant="outline" onClick={() => run({ type: "stopRepeating" })} className="flex-1">
            Sluta repetera
          </Button>
        )}
      </div>
    </div>
  );
}

const SOUNDS: readonly { sound: PlayerSound; label: string }[] = [
  { sound: "choir", label: "Kör" },
  { sound: "piano", label: "Piano" },
];

/**
 * The Stämmor sheet: the Kör | Piano switch, "Min stämma" with its presets,
 * then a row per part with volume, mute (M) and solo (S). On desktop the
 * parts are `numbered` for the keys 1–9.
 */
export function PartsControls({
  parts,
  run,
  numbered,
}: {
  parts: PlayerControlsView["parts"];
  run: RunCommand;
  numbered: boolean;
}) {
  const { mine, preset, sound, list } = parts;

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border p-0.5" role="group" aria-label="Ljud">
        {SOUNDS.map((option) => (
          <ToggleButton
            key={option.sound}
            pressed={sound === option.sound}
            onClick={() => run({ type: "setSound", sound: option.sound })}
            className="h-8 flex-1 rounded-md border-0"
          >
            {option.label}
          </ToggleButton>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Min stämma</p>
        <div className="flex flex-wrap gap-1.5">
          {list
            .filter(({ percussion }) => !percussion)
            .map((part) => (
              <ToggleButton
                key={part.id}
                pressed={mine === part.id}
                onClick={() => run({ type: "chooseMine", partId: mine === part.id ? null : part.id })}
                className="min-h-10 min-w-12 rounded-full px-3"
              >
                {part.name}
              </ToggleButton>
            ))}
        </div>
        <div className="flex gap-1">
          {MIX_PRESETS.map((option) => (
            <ToggleButton
              key={option.preset}
              pressed={preset === option.preset}
              disabled={mine === null && option.preset !== "equal"}
              onClick={() => run({ type: "applyPreset", preset: option.preset })}
              className="flex-1 px-1 py-1.5 text-xs"
            >
              {option.label}
            </ToggleButton>
          ))}
        </div>
      </div>

      <div className="divide-y border-t">
        {list.map((part, index) => (
          <PartRow key={part.id} part={part} number={numbered && index < 9 ? index + 1 : null} run={run} />
        ))}
      </div>
    </div>
  );
}

/** One part's volume, M and S; dimmed while it isn't heard. */
function PartRow({ part, number, run }: { part: PartView; number: number | null; run: RunCommand }) {
  const { heard } = part;
  const setPart = (change: Partial<Pick<PartView, "gain" | "muted" | "solo">>) =>
    run({ type: "setPart", partId: part.id, change });
  return (
    <div className="flex items-center gap-2 py-1.5">
      {number === null ? null : <Kbd className="w-5 shrink-0 text-center">{number}</Kbd>}
      <span className={cn("w-20 shrink-0 truncate text-sm", !heard && "text-muted-foreground")}>
        {part.name}
        {part.percussion ? <span className="block text-[10px] text-muted-foreground">slagverk</span> : null}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={part.gain}
        onChange={(event) => setPart({ gain: Number(event.target.value) })}
        aria-label={`Volym ${part.name}`}
        className={cn("min-w-0 flex-1 accent-primary", !heard && "opacity-40")}
      />
      <ToggleButton
        pressed={part.muted}
        onClick={() => setPart({ muted: !part.muted })}
        aria-label={`Tysta ${part.name}`}
        title="Tysta"
        className="size-9 shrink-0 text-xs font-semibold aria-pressed:border-red-500 aria-pressed:bg-red-500 aria-pressed:text-white"
      >
        M
      </ToggleButton>
      <ToggleButton
        pressed={part.solo}
        onClick={() => setPart({ solo: !part.solo })}
        aria-label={`Solo ${part.name}`}
        title="Solo"
        className="size-9 shrink-0 text-xs font-semibold aria-pressed:border-amber-500 aria-pressed:bg-amber-400 aria-pressed:text-black"
      >
        S
      </ToggleButton>
    </div>
  );
}

/** A button that stays pressed while its setting is on. */
function ToggleButton({
  pressed,
  className,
  ...props
}: Omit<ComponentProps<"button">, "type" | "aria-pressed"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "rounded-lg border text-sm disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-primary/10",
        className,
      )}
      {...props}
    />
  );
}

/** A key on the keyboard, as the desktop layout shows its shortcuts. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground", className)}>
      {children}
    </kbd>
  );
}
