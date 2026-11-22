"use client";

// PROTOTYPE (PER-458): small controls from the phone player (variant A) that
// the desktop variants (PER-463) reuse, each laying them out its own way.

import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Part } from "./fixtures";
import type { PlayerState, Preset } from "./usePlayerState";

export type PlayerContext = {
  pieceName: string;
  backHref: string;
  hrefFor: (fileKey: string) => string;
  setListName?: string;
};

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
