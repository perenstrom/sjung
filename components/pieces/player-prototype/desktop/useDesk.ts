"use client";

// PROTOTYPE (PER-463): one shape for the desktop variants, whichever engine is
// behind it (alphaTab for notation files, the fake clock for audio and MIDI),
// plus the keyboard shortcuts every desktop variant shares. Throwaway.

import { useEffect, useRef, useState, type RefObject } from "react";

import type { Part, PlayableFixture } from "../fixtures";
import { barOf, formatTime, type PlayerState, usePlayerState } from "../usePlayerState";
import { type AlphaTabPlayerState, type Options, useAlphaTabPlayer } from "../alphatab/useAlphaTabPlayer";

export type Desk = {
  fixture: PlayableFixture;
  engine: "alphatab" | "fake";
  /** What to show over the score while it loads, or null once it is drawn. */
  status: string | null;
  ready: boolean;
  playing: boolean;
  togglePlay: () => void;
  position: number;
  duration: number;
  seek: (seconds: number) => void;
  /** 1-based bar under the playhead; null for audio, which has no bars. */
  bar: number | null;
  tempo: number;
  setTempo: (percent: number) => void;
  parts: Part[];
  /** The shared phone controls take the fake player's shape. */
  compat: PlayerState;
  loop: { a: string; b: string | null } | null;
  loopFrac: { from: number; to: number | null } | null;
  markA: () => void;
  markB: () => void;
  clearLoop: () => void;
  stepBar: (delta: number) => void;
  toStart: () => void;
  toggleSolo: (index: number) => void;
  resetMix: () => void;
  scoreRef?: RefObject<HTMLDivElement | null>;
  scrollRef?: RefObject<HTMLElement | null>;
};

export function useAlphaTabDesk(fixture: PlayableFixture, url: string, options: Options): Desk {
  const scoreRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const s: AlphaTabPlayerState = useAlphaTabPlayer({ url, options, scoreRef, scrollRef });
  const compat = {
    ...s,
    fixture: { ...fixture, parts: s.parts, bpm: s.debug.tempo ?? fixture.bpm },
  } as unknown as PlayerState;
  return {
    fixture,
    engine: "alphatab",
    status:
      s.status === "ready"
        ? null
        : s.status === "error"
          ? `Fel: ${s.error}`
          : s.status === "rendering"
            ? "Ritar noterna…"
            : "Laddar noterna…",
    ready: s.playerReady,
    playing: s.playing,
    togglePlay: s.togglePlay,
    position: s.position,
    duration: s.duration,
    seek: s.seek,
    bar: s.currentBar,
    tempo: s.tempo,
    setTempo: s.setTempo,
    parts: s.parts,
    compat,
    loop: s.loop ? { a: `takt ${s.loop.a + 1}`, b: s.loop.b === null ? null : `takt ${s.loop.b + 1}` } : null,
    loopFrac: s.loopFractions(),
    markA: () => s.markAt("a"),
    markB: () => s.markAt("b"),
    clearLoop: () => s.setLoop(null),
    stepBar: s.stepBar,
    toStart: s.toStart,
    toggleSolo: (i) => {
      const p = s.parts[i];
      if (p) s.setChannel(p.id, { solo: !s.channels[p.id]?.solo });
    },
    resetMix: () => {
      s.chooseMyPart(null);
      s.applyPreset("all", null);
    },
    scoreRef,
    scrollRef,
  };
}

export function useFakeDesk(fixture: PlayableFixture): Desk {
  const s = usePlayerState(fixture);
  const audio = fixture.format === "audio";
  const at = (seconds: number) => (audio ? formatTime(seconds) : `takt ${barOf(s, seconds)}`);
  const barStart = (seconds: number) => (audio ? seconds : (barOf(s, seconds) - 1) * s.barSeconds);
  const barEnd = (seconds: number) => (audio ? seconds : barOf(s, seconds) * s.barSeconds);
  return {
    fixture,
    engine: "fake",
    status: null,
    ready: true,
    playing: s.playing,
    togglePlay: s.togglePlay,
    position: s.position,
    duration: s.duration,
    seek: s.seek,
    bar: audio ? null : s.currentBar,
    tempo: s.tempo,
    setTempo: s.setTempo,
    parts: fixture.parts,
    compat: s,
    loop: s.loop ? { a: at(s.loop.a), b: s.loop.b === null ? null : at(s.loop.b - (audio ? 0 : 0.01)) } : null,
    loopFrac: s.loop ? { from: s.loop.a / s.duration, to: s.loop.b === null ? null : s.loop.b / s.duration } : null,
    markA: () => {
      const a = barStart(s.position);
      s.setLoop((l) => ({ a, b: l?.b != null && l.b > a ? l.b : null }));
    },
    markB: () => {
      const b = barEnd(s.position);
      s.setLoop((l) => (!l ? { a: barStart(s.position), b } : { a: Math.min(l.a, barStart(s.position)), b: Math.max(b, l.a + 0.5) }));
    },
    clearLoop: () => s.setLoop(null),
    stepBar: (d) => {
      if (audio) return s.seek(s.position + d * 5);
      const bar = barOf(s, s.position) - 1;
      const into = s.position - bar * s.barSeconds;
      const target = d < 0 && into > 0.25 ? bar + d + 1 : bar + d;
      s.seek(Math.max(0, target) * s.barSeconds);
    },
    toStart: () => s.seek(s.loop?.a ?? 0),
    toggleSolo: (i) => {
      const p = fixture.parts[i];
      if (p) s.setChannel(p.id, { solo: !s.channels[p.id]?.solo });
    },
    resetMix: () => {
      s.chooseMyPart(null);
      s.applyPreset("all", null);
    },
  };
}

export const SHORTCUTS: { keys: string[]; what: string }[] = [
  { keys: ["Mellanslag"], what: "Spela / pausa" },
  { keys: ["←", "→"], what: "En takt bakåt / framåt (ljudfiler: 5 sekunder)" },
  { keys: ["Shift", "←/→"], what: "Fyra takter bakåt / framåt" },
  { keys: ["Home"], what: "Till början (eller till repetitionens start)" },
  { keys: ["A"], what: "Repetera från takten som spelas" },
  { keys: ["B"], what: "Repetera till och med takten som spelas" },
  { keys: ["Esc"], what: "Sluta repetera" },
  { keys: ["−", "+"], what: "Tempo 5 % långsammare / snabbare" },
  { keys: ["1–9"], what: "Solo på stämma 1–9 (igen för att släppa)" },
  { keys: ["0"], what: "Alla stämmor lika" },
  { keys: ["?"], what: "Visa kortkommandon" },
];

/** The keyboard shortcuts, and a short message (HUD) saying what a key just did. */
export function useShortcuts(desk: Desk) {
  const [hud, setHud] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const ref = useRef(desk);
  useEffect(() => {
    ref.current = desk;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const say = (text: string) => {
      setHud(text);
      clearTimeout(timer);
      timer = setTimeout(() => setHud(null), 1600);
    };
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t?.closest("textarea, select, [contenteditable=''], [contenteditable='true'], input:not([type=range])")) return;
      const onRange = t instanceof HTMLInputElement && t.type === "range";
      const layerOpen = !!document.querySelector("[data-slot='popover-content'], [role='dialog']");
      const d = ref.current;
      const bars = d.bar != null;
      switch (e.key) {
        case " ":
          e.preventDefault();
          d.togglePlay();
          return;
        case "ArrowLeft":
        case "ArrowRight": {
          if (onRange || layerOpen) return;
          e.preventDefault();
          const step = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 4 : 1);
          d.stepBar(step);
          say(bars ? `${step > 0 ? "+" : "−"}${Math.abs(step)} takt${Math.abs(step) > 1 ? "er" : ""}` : `${step > 0 ? "+" : "−"}${Math.abs(step) * 5} s`);
          return;
        }
        case "Home":
          e.preventDefault();
          d.toStart();
          say(d.loop?.b ? "Till repetitionens start" : "Till början");
          return;
        case "a":
        case "A":
          d.markA();
          say(bars ? `Repetera från takt ${d.bar} – tryck B vid slutet` : "Repetera härifrån – tryck B vid slutet");
          return;
        case "b":
        case "B":
          d.markB();
          say(bars ? `Repetera till takt ${d.bar}` : "Repetera hit");
          return;
        case "Escape":
          if (layerOpen || !d.loop) return;
          d.clearLoop();
          say("Repeterar inte längre");
          return;
        case "-":
        case "_":
          d.setTempo(d.tempo - 5);
          say(`Tempo ${Math.max(50, d.tempo - 5)} %`);
          return;
        case "+":
        case "=":
          d.setTempo(d.tempo + 5);
          say(`Tempo ${Math.min(120, d.tempo + 5)} %`);
          return;
        case "0":
          d.resetMix();
          say("Alla stämmor lika");
          return;
        case "?":
          setHelpOpen((o) => !o);
          return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        const part = d.parts[i];
        if (!part) return;
        const on = !d.compat.channels[part.id]?.solo;
        d.toggleSolo(i);
        say(`${on ? "Solo" : "Inte solo"}: ${part.label}`);
      }
    }
    // A focused button would also "click" on the space bar's keyup.
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " " && e.target instanceof HTMLElement && e.target.closest("button")) e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      clearTimeout(timer);
    };
  }, []);

  return { hud, helpOpen, setHelpOpen };
}
