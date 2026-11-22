"use client";

// PROTOTYPE (PER-464): variant T – variant A "Musikapp" with alphaTab in place
// of the fake score and clock. The amber row under the header holds the
// prototype's switches (all in the URL, so a setup can be shared):
//   split=0|1   per-voice parts for staves with two voices (default 1)
//   hyph=0|1    append "-" to begin/middle syllables (default 0 = alphaTab as is)
//   order=0|1   sort each note's verses by number (default 1; 0 shows alphaTab's own order)
//   short=0|1   mark bars shorter than their time signature implicit (default 1;
//               0 lets alphaTab pad them with silence)
//   scale=…     alphaTab display scale (default 0.8)
//   layout=page|horizontal
//   sound=choir|piano

import { Cpu, Music, Repeat, SlidersHorizontal, Timer } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  ChannelRow,
  MyPartPicker,
  PlayButton,
  type PlayerContext,
  PlayerHeader,
  PresetButtons,
  TempoSlider,
} from "../controls";
import type { PlayableFixture } from "../fixtures";
import { formatTime, type PlayerState } from "../usePlayerState";
import { readOutput } from "./engine";
import { type AlphaTabPlayerState, type Options, useAlphaTabPlayer } from "./useAlphaTabPlayer";

type SheetKey = "mix" | "tempo" | "loop" | "motor" | null;

export function AlphaTabPlayer({ ctx, fixture }: { ctx: PlayerContext; fixture: PlayableFixture }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const options: Options = {
    split: params.get("split") !== "0",
    hyphens: params.get("hyph") === "1",
    orderVerses: params.get("order") !== "0",
    shortBars: params.get("short") !== "0",
    scale: Number(params.get("scale") ?? 0.8),
    layout: params.get("layout") === "horizontal" ? "horizontal" : "page",
    sound: params.get("sound") === "piano" ? "piano" : "choir",
  };
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const shell = (children: ReactNode) => (
    <div className="fixed inset-x-0 top-9 bottom-0 z-40 flex flex-col bg-background">{children}</div>
  );

  if (!fixture.url) {
    return shell(
      <>
        <PlayerHeader ctx={ctx} state={{ fixture } as unknown as PlayerState} />
        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
          <div className="space-y-3">
            <Music className="mx-auto size-16 text-muted-foreground/40" />
            <p>Variant T visar bara notfiler. MIDI spelas av SpessaSynth och ljud av en vanlig ljudspelare.</p>
          </div>
        </div>
      </>
    );
  }

  return shell(
    <Engine ctx={ctx} fixture={fixture} url={fixture.url} options={options} setParam={setParam} />
  );
}

function Engine({
  ctx,
  fixture,
  url,
  options,
  setParam,
}: {
  ctx: PlayerContext;
  fixture: PlayableFixture;
  url: string;
  options: Options;
  setParam: (key: string, value: string) => void;
}) {
  const scoreRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const s = useAlphaTabPlayer({ url, options, scoreRef, scrollRef });
  const [sheet, setSheet] = useState<SheetKey>(null);

  // The shared controls were written for the fake player; give them its shape.
  const compat = {
    ...s,
    fixture: { ...fixture, parts: s.parts, bpm: s.debug.tempo ?? fixture.bpm },
  } as unknown as PlayerState;

  const dockButton = (key: Exclude<SheetKey, null>, icon: ReactNode, label: string, active: boolean) => (
    <button
      type="button"
      onClick={() => setSheet(key)}
      className={cn(
        "flex w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px]",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      <style>{ALPHATAB_CSS}</style>
      <PlayerHeader ctx={ctx} state={compat} />
      <div className="flex items-center gap-1 overflow-x-auto bg-amber-100 px-2 py-1 text-[11px] text-black">
        <Toggle on={options.split} onClick={() => setParam("split", options.split ? "0" : "1")}>
          Dela röster
        </Toggle>
        <Toggle on={options.hyphens} onClick={() => setParam("hyph", options.hyphens ? "0" : "1")}>
          Bindestreck
        </Toggle>
        <span className="flex shrink-0 items-center rounded-full border border-black/20">
          <button type="button" className="px-2 py-0.5" onClick={() => setParam("scale", (options.scale - 0.1).toFixed(1))}>
            −
          </button>
          <span className="tabular-nums">{Math.round(options.scale * 100)}%</span>
          <button type="button" className="px-2 py-0.5" onClick={() => setParam("scale", (options.scale + 0.1).toFixed(1))}>
            +
          </button>
        </span>
        <Toggle
          on={options.layout === "horizontal"}
          onClick={() => setParam("layout", options.layout === "page" ? "horizontal" : "page")}
        >
          {options.layout === "page" ? "Sida" : "En rad"}
        </Toggle>
        <Toggle on={options.sound === "piano"} onClick={() => setParam("sound", options.sound === "choir" ? "piano" : "choir")}>
          {options.sound === "choir" ? "Kör" : "Piano"}
        </Toggle>
        <button
          type="button"
          onClick={() => setSheet("motor")}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-black/20 px-2 py-0.5"
        >
          <Cpu className="size-3" /> Motor
        </button>
      </div>

      <main ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-white text-black">
        {s.status !== "ready" ? (
          <div className="pointer-events-none absolute inset-x-0 top-6 z-10 text-center text-sm text-neutral-500">
            {s.status === "error" ? `Fel: ${s.error}` : s.status === "rendering" ? "Ritar noterna…" : "Laddar alphaTab…"}
          </div>
        ) : null}
        <div ref={scoreRef} />
      </main>

      <footer className="border-t bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        <Seek s={s} />
        <div className="mt-1 flex items-center justify-between">
          {dockButton("tempo", <Timer className="size-5" />, `${s.tempo} %`, s.tempo !== 100)}
          {dockButton("loop", <Repeat className="size-5" />, "Repetera", s.loop?.b != null)}
          <div className={cn(!s.playerReady && "pointer-events-none opacity-40")}>
            <PlayButton state={compat} />
          </div>
          {dockButton(
            "mix",
            <SlidersHorizontal className="size-5" />,
            "Stämmor",
            s.preset !== "all" || Object.values(s.channels).some((c) => c.muted || c.solo || c.volume !== 80)
          )}
          <span className="w-14 truncate text-center text-[11px] text-muted-foreground">
            {s.myPart ? s.parts.find((p) => p.id === s.myPart)?.label : ""}
          </span>
        </div>
      </footer>

      <Sheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>
              {{ mix: "Stämmor", tempo: "Tempo", loop: "Repetera", motor: "Motor (prototyp)" }[sheet ?? "mix"]}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            {sheet === "mix" ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Min stämma</p>
                  <MyPartPicker state={compat} />
                  <PresetButtons state={compat} />
                </div>
                <div className="divide-y border-t">
                  {s.parts.map((p) => (
                    <ChannelRow key={p.id} state={compat} part={p} />
                  ))}
                </div>
              </>
            ) : null}
            {sheet === "tempo" ? <TempoSlider state={compat} /> : null}
            {sheet === "loop" ? <LoopText s={s} /> : null}
            {sheet === "motor" ? <Motor s={s} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("shrink-0 rounded-full border border-black/20 px-2 py-0.5", on && "bg-black text-white")}
    >
      {children}
    </button>
  );
}

function Seek({ s }: { s: AlphaTabPlayerState }) {
  return (
    <div className="space-y-1">
      <input
        type="range"
        min={0}
        max={s.duration || 1}
        step={0.1}
        value={s.position}
        onChange={(e) => s.seek(Number(e.target.value))}
        aria-label="Position"
        className="h-6 w-full accent-primary"
      />
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>
          {formatTime(s.position)} · takt {s.currentBar}
          {s.loop?.b != null ? ` · repeterar ${s.loop.a + 1}–${s.loop.b + 1}` : ""}
        </span>
        <span>{formatTime(s.duration)}</span>
      </div>
    </div>
  );
}

function LoopText({ s }: { s: AlphaTabPlayerState }) {
  const text = !s.loop
    ? "Tryck på en takt i noterna för att börja ett avsnitt"
    : s.loop.b === null
      ? `Start: takt ${s.loop.a + 1}. Tryck på sluttakten.`
      : `Repeterar takt ${s.loop.a + 1}–${s.loop.b + 1}`;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Repeat className={cn("size-4 shrink-0", s.loop?.b != null ? "text-amber-600" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1">{text}</span>
      {s.loop ? (
        <button type="button" onClick={() => s.setLoop(null)} className="shrink-0 rounded border px-2 py-1 text-xs">
          Rensa
        </button>
      ) : null}
    </div>
  );
}

function Motor({ s }: { s: AlphaTabPlayerState }) {
  const d = s.debug;
  return (
    <div className="space-y-3 font-mono text-[11px] leading-snug">
      <section>
        <p className="font-sans text-xs font-medium">Tider (ms från start)</p>
        <p>
          {Object.entries(d.timings)
            .map(([k, v]) => `${k} ${v}`)
            .join(" · ") || "–"}
        </p>
      </section>
      {d.file ? (
        <section>
          <p className="font-sans text-xs font-medium">Fil</p>
          <p>
            {d.file.software ?? "okänt program"} · {d.bars} takter · ♩={d.tempo} · {d.file.lyrics.verses} verser,{" "}
            {d.file.lyrics.syllables} stavelser, {d.file.lyrics.extends} melisman (extend)
            {d.file.lyrics.hyphenated ? `, ${d.file.lyrics.hyphenated} bindestreck tillagda` : ""}
            {d.file.lyrics.reordered ? `, verser omsorterade på ${d.file.lyrics.reordered} noter` : ""}
            {d.file.shortBars.length ? ` · korta takter markerade: ${d.file.shortBars.join(", ")}` : ""}
          </p>
        </section>
      ) : null}
      <section>
        <p className="font-sans text-xs font-medium">Spår</p>
        <table className="w-full">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th>#</th>
              <th>namn</th>
              <th>roll</th>
              <th>kan.</th>
              <th>prog</th>
              <th>mix</th>
            </tr>
          </thead>
          <tbody>
            {d.tracks.map((t) => {
              const c = s.channels[String(t.index)];
              return (
                <tr key={t.index}>
                  <td>{t.index}</td>
                  <td>{t.name}</td>
                  <td>
                    {t.role.kind === "display"
                      ? `ritas, tyst (${t.role.voices} röster)`
                      : t.role.kind === "voice"
                        ? `dold, röst ${t.role.voice + 1} av #${t.role.of}`
                        : "ritas"}
                  </td>
                  <td>{t.channel}</td>
                  <td>{t.program}</td>
                  <td>{c ? `${c.volume}${c.muted ? " M" : ""}${c.solo ? " S" : ""} → ${s.audible[String(t.index)]}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {d.warnings.map((w) => (
          <p key={w} className="text-red-600">
            {w}
          </p>
        ))}
      </section>
      <OutputMeter />
      <section>
        <p className="font-sans text-xs font-medium">Spelläge</p>
        <p>
          tick {d.tick} · takt {s.currentBar} · {s.playing ? "spelar" : "paus"} · tempo {s.tempo}% · intervall{" "}
          {d.range ? `${d.range.startTick}–${d.range.endTick}` : "inget"}
        </p>
      </section>
      <section>
        <p className="font-sans text-xs font-medium">Repriser och hopp i modellen</p>
        {d.repeats.length ? d.repeats.map((r) => <p key={r}>{r}</p>) : <p>inga</p>}
      </section>
      <section>
        <p className="font-sans text-xs font-medium">Logg</p>
        {d.log.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </section>
    </div>
  );
}

/** What is actually coming out of the speakers right now. */
function OutputMeter() {
  const [out, setOut] = useState<ReturnType<typeof readOutput>>(null);
  useEffect(() => {
    const id = setInterval(() => setOut(readOutput()), 150);
    return () => clearInterval(id);
  }, []);
  const db = out ? Math.max(-60, out.db) : -60;
  return (
    <section>
      <p className="font-sans text-xs font-medium">Utgång</p>
      <div className="h-2 rounded bg-muted">
        <div className="h-2 rounded bg-green-600" style={{ width: `${((db + 60) / 60) * 100}%` }} />
      </div>
      <p data-testid="output">
        {out ? `${Number.isFinite(out.db) ? out.db.toFixed(0) : "-∞"} dB · ton ${out.pitch ?? "–"}` : "ingen ljudkontext än"}
      </p>
    </section>
  );
}

// alphaTab's cursor and selection need styles from the host page.
const ALPHATAB_CSS = `
.at-cursor-bar { background: rgb(255 200 0 / 0.18); }
.at-cursor-beat { background: rgb(37 99 235 / 0.85); width: 3px; }
.at-selection div { background: rgb(245 158 11 / 0.25); }
.at-highlight * { fill: rgb(37 99 235); stroke: rgb(37 99 235); }
`;
