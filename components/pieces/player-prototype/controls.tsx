"use client";

// PROTOTYPE (PER-458): small controls the three player variants share. Each
// variant lays them out its own way.

import { ChevronDown, Pause, Play, Repeat, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { FIXTURES, FORMAT_LABEL, type Part } from "./fixtures";
import { barOf, formatTime, type PlayerState, type Preset } from "./usePlayerState";

export type PlayerContext = {
  pieceName: string;
  backHref: string;
  hrefFor: (fileKey: string) => string;
  setListName?: string;
};

export function PlayerHeader({ ctx, state, className }: { ctx: PlayerContext; state: PlayerState; className?: string }) {
  const router = useRouter();
  return (
    <header className={cn("flex items-center gap-2 border-b px-3 py-2", className)}>
      <Link href={ctx.backHref} aria-label="Stäng spelaren" className="-ml-1 rounded-full p-2 hover:bg-muted">
        <X className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{ctx.pieceName}</p>
        <label className="relative flex items-center gap-1 text-xs text-muted-foreground">
          <select
            value={state.fixture.key}
            onChange={(e) => router.replace(ctx.hrefFor(e.target.value), { scroll: false })}
            className="max-w-full appearance-none truncate bg-transparent pr-4"
          >
            {FIXTURES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.fileName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 size-3" />
        </label>
      </div>
      {ctx.setListName ? (
        <span className="hidden shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground min-[380px]:inline">
          {ctx.setListName}
        </span>
      ) : null}
      <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {FORMAT_LABEL[state.fixture.format]}
      </span>
    </header>
  );
}

export function PlayButton({ state, size = "lg" }: { state: PlayerState; size?: "md" | "lg" | "xl" }) {
  const dim = { md: "size-10", lg: "size-14", xl: "size-20" }[size];
  const icon = { md: "size-5", lg: "size-7", xl: "size-9" }[size];
  return (
    <button
      type="button"
      onClick={state.togglePlay}
      aria-label={state.playing ? "Pausa" : "Spela"}
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow", dim)}
    >
      {state.playing ? <Pause className={icon} /> : <Play className={cn(icon, "translate-x-0.5")} />}
    </button>
  );
}

export function SeekBar({ state, className }: { state: PlayerState; className?: string }) {
  const pct = (s: number) => `${(s / state.duration) * 100}%`;
  const hasBars = state.fixture.format !== "audio";
  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative h-6">
        {state.loop ? (
          <div
            className="absolute top-2 h-2 rounded bg-amber-300/70"
            style={{
              left: pct(state.loop.a),
              width: state.loop.b === null ? "3px" : pct(state.loop.b - state.loop.a),
            }}
          />
        ) : null}
        <input
          type="range"
          min={0}
          max={state.duration}
          step={0.1}
          value={state.position}
          onChange={(e) => state.seek(Number(e.target.value))}
          aria-label="Position"
          className="absolute inset-0 w-full accent-primary"
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>
          {formatTime(state.position)}
          {hasBars ? ` · takt ${state.currentBar}` : ""}
        </span>
        <span>{formatTime(state.duration)}</span>
      </div>
    </div>
  );
}

export function TempoSlider({ state }: { state: PlayerState }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-sm">
        <span>Tempo</span>
        <span className="tabular-nums text-muted-foreground">
          {state.tempo} % · {Math.round((state.fixture.bpm * state.tempo) / 100)} bpm
        </span>
      </span>
      <input
        type="range"
        min={50}
        max={120}
        step={5}
        value={state.tempo}
        onChange={(e) => state.setTempo(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <span className="flex gap-1">
        {[60, 75, 90, 100].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => state.setTempo(t)}
            className={cn(
              "flex-1 rounded border py-1 text-xs",
              state.tempo === t && "border-primary bg-primary/10 font-medium"
            )}
          >
            {t} %
          </button>
        ))}
      </span>
    </label>
  );
}

export function TempoStepper({ state }: { state: PlayerState }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">Tempo</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => state.setTempo(state.tempo - 10)}
          className="size-11 rounded-full border text-lg"
          aria-label="Långsammare"
        >
          −
        </button>
        <span className="w-16 text-center text-lg font-medium tabular-nums">{state.tempo} %</span>
        <button
          type="button"
          onClick={() => state.setTempo(state.tempo + 10)}
          className="size-11 rounded-full border text-lg"
          aria-label="Snabbare"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** What the A–B passage is, and how to set or clear it. */
export function LoopStatus({ state, className }: { state: PlayerState; className?: string }) {
  const scored = state.fixture.hasScore;
  const bars = state.fixture.format !== "audio";
  let text: string;
  if (!state.loop) {
    text = scored ? "Tryck på en takt i noterna för att repetera ett avsnitt" : "Repetera ett avsnitt: sätt start och slut";
  } else if (state.loop.b === null) {
    text = scored
      ? `Start: takt ${barOf(state, state.loop.a)}. Tryck på sluttakten.`
      : `Start ${formatTime(state.loop.a)}. Tryck igen vid slutet.`;
  } else {
    text = bars
      ? `Repeterar takt ${barOf(state, state.loop.a)}–${barOf(state, state.loop.b - 0.01)}`
      : `Repeterar ${formatTime(state.loop.a)}–${formatTime(state.loop.b)}`;
  }
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Repeat className={cn("size-4 shrink-0", state.loop?.b != null ? "text-amber-600" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1">{text}</span>
      {!scored ? (
        <button type="button" onClick={state.markLoop} className="shrink-0 rounded border px-2 py-1 text-xs">
          {!state.loop || state.loop.b !== null ? "Start här" : "Slut här"}
        </button>
      ) : null}
      {state.loop ? (
        <button type="button" onClick={() => state.setLoop(null)} className="shrink-0 rounded border px-2 py-1 text-xs">
          Rensa
        </button>
      ) : null}
    </div>
  );
}

const PRESETS: { key: Preset; label: string; hint: string }[] = [
  { key: "all", label: "Alla lika", hint: "Alla stämmor lika starkt" },
  { key: "lift", label: "Framhäv min", hint: "Din stämma starkare, de andra svagare" },
  { key: "without", label: "Utan min", hint: "Sjung själv mot de andra" },
  { key: "only", label: "Bara min", hint: "Lär dig din stämma" },
];

export function MyPartPicker({ state, className }: { state: PlayerState; className?: string }) {
  const voices = state.fixture.parts.filter((p) => p.kind === "voice");
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {voices.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => state.chooseMyPart(state.myPart === p.id ? null : p.id)}
          className={cn(
            "min-h-10 min-w-12 rounded-full border px-3 text-sm",
            state.myPart === p.id && "border-primary bg-primary text-primary-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function PresetButtons({
  state,
  layout = "row",
}: {
  state: PlayerState;
  layout?: "row" | "cards";
}) {
  const disabled = !state.myPart;
  return (
    <div className={layout === "cards" ? "grid grid-cols-2 gap-2" : "flex gap-1"}>
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          disabled={disabled && p.key !== "all"}
          onClick={() => state.applyPreset(p.key)}
          className={cn(
            "rounded-lg border text-left disabled:opacity-40",
            layout === "cards" ? "p-3" : "flex-1 px-1 py-1.5 text-center text-xs",
            state.preset === p.key && "border-primary bg-primary/10"
          )}
        >
          <span className={cn("block", layout === "cards" ? "font-medium" : "")}>{p.label}</span>
          {layout === "cards" ? <span className="block text-xs text-muted-foreground">{p.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ChannelRow({ state, part, big = false }: { state: PlayerState; part: Part; big?: boolean }) {
  const c = state.channels[part.id];
  const level = state.audible[part.id];
  return (
    <div className={cn("flex items-center gap-2", big ? "py-2" : "py-1")}>
      <span className={cn("w-16 shrink-0 truncate", big ? "text-base font-medium" : "text-sm")}>
        {part.label}
        {part.kind === "percussion" ? <span className="block text-[10px] text-muted-foreground">slagverk</span> : null}
        {part.staff && part.staff !== part.label ? (
          <span className="block text-[10px] text-muted-foreground">{part.staff}</span>
        ) : null}
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-y-0 left-0 my-auto h-1 rounded bg-primary/20" style={{ width: `${level}%` }} />
        <input
          type="range"
          min={0}
          max={100}
          value={c.volume}
          onChange={(e) => state.setChannel(part.id, { volume: Number(e.target.value) })}
          aria-label={`Volym ${part.label}`}
          className="relative w-full accent-primary"
        />
      </div>
      <button
        type="button"
        onClick={() => state.setChannel(part.id, { muted: !c.muted })}
        className={cn("size-9 shrink-0 rounded border text-xs font-semibold", c.muted && "border-red-500 bg-red-500 text-white")}
        aria-pressed={c.muted}
        title="Tysta"
      >
        M
      </button>
      <button
        type="button"
        onClick={() => state.setChannel(part.id, { solo: !c.solo })}
        className={cn(
          "size-9 shrink-0 rounded border text-xs font-semibold",
          c.solo && "border-amber-500 bg-amber-400 text-black"
        )}
        aria-pressed={c.solo}
        title="Solo"
      >
        S
      </button>
    </div>
  );
}

export function NoScoreNotice({ state }: { state: PlayerState }) {
  if (state.fixture.hasScore) return null;
  return (
    <p className="text-center text-sm text-muted-foreground">
      {state.fixture.format === "audio"
        ? "Ljudfil – inga noter att visa."
        : "MIDI-filer har inga noter att visa. Finns noterna som MusicXML eller MuseScore, öppna den filen."}
    </p>
  );
}
