"use client";

// PROTOTYPE (PER-458): a fake player. A clock advances the position; nothing
// makes a sound. Mix, tempo and loop are plain state so the UI can be judged.

import { useEffect, useMemo, useRef, useState } from "react";

import type { PlayableFixture } from "./fixtures";

export type Channel = { volume: number; muted: boolean; solo: boolean };
export type Preset = "all" | "lift" | "without" | "only";
export type Loop = { a: number; b: number | null } | null;

export function usePlayerState(fixture: PlayableFixture) {
  const barSeconds = (fixture.beatsPerBar * 60) / fixture.bpm;
  const duration = fixture.bars * barSeconds;

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [tempo, setTempo] = useState(100);
  const [loop, setLoop] = useState<Loop>(null);
  const [channels, setChannels] = useState<Record<string, Channel>>(() =>
    Object.fromEntries(fixture.parts.map((p) => [p.id, { volume: 80, muted: false, solo: false }]))
  );
  const [myPart, setMyPart] = useState<string | null>(null);
  const [preset, setPresetState] = useState<Preset>("all");

  const state = useRef({ tempo, loop, duration });
  state.current = { tempo, loop, duration };

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = ((now - last) / 1000) * (state.current.tempo / 100);
      last = now;
      setPosition((pos) => {
        let next = pos + dt;
        const { loop: l, duration: d } = state.current;
        if (l && l.b !== null && next >= l.b) next = l.a;
        if (next >= d) {
          setPlaying(false);
          return d;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function setChannel(id: string, patch: Partial<Channel>) {
    setChannels((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setPresetState("all");
  }

  /** "Min stämma": pick one part, then bring it forward or leave it out. */
  function applyPreset(next: Preset, part = myPart) {
    setPresetState(next);
    setChannels(
      Object.fromEntries(
        fixture.parts.map((p) => {
          const mine = p.id === part;
          const base: Channel = { volume: 80, muted: false, solo: false };
          if (!part || next === "all") return [p.id, base];
          if (next === "lift") return [p.id, { ...base, volume: mine ? 100 : 35 }];
          if (next === "without") return [p.id, { ...base, muted: mine }];
          return [p.id, { ...base, muted: !mine }];
        })
      )
    );
  }

  function chooseMyPart(id: string | null) {
    setMyPart(id);
    applyPreset(id ? (preset === "all" ? "lift" : preset) : "all", id);
  }

  const anySolo = Object.values(channels).some((c) => c.solo);
  /** What each part actually sounds at, 0–100, after mute and solo. */
  const audible = useMemo(
    () =>
      Object.fromEntries(
        fixture.parts.map((p) => {
          const c = channels[p.id];
          const silent = c.muted || (anySolo && !c.solo);
          return [p.id, silent ? 0 : c.volume];
        })
      ),
    [channels, anySolo, fixture.parts]
  );

  return {
    fixture,
    barSeconds,
    duration,
    playing,
    togglePlay: () => {
      if (position >= duration) setPosition(loop?.a ?? 0);
      setPlaying((p) => !p);
    },
    position,
    seek: (s: number) => setPosition(Math.max(0, Math.min(duration, s))),
    currentBar: Math.min(fixture.bars, Math.floor(position / barSeconds) + 1),
    tempo,
    setTempo: (t: number) => setTempo(Math.max(50, Math.min(120, Math.round(t)))),
    loop,
    setLoop,
    /** Tap a bar: the first tap sets the start, the second the end. */
    tapBar: (bar: number) => {
      const start = (bar - 1) * barSeconds;
      const end = bar * barSeconds;
      setLoop((l) => {
        if (!l || l.b !== null) return { a: start, b: null };
        return l.a <= start ? { a: l.a, b: end } : { a: start, b: l.a + barSeconds };
      });
    },
    /** For files without bars (audio): mark A, then B, at the playhead. */
    markLoop: () =>
      setLoop((l) => {
        if (!l || l.b !== null) return { a: position, b: null };
        return position > l.a ? { a: l.a, b: position } : { a: position, b: l.a };
      }),
    channels,
    setChannel,
    audible,
    myPart,
    chooseMyPart,
    preset,
    applyPreset,
  };
}

export type PlayerState = ReturnType<typeof usePlayerState>;

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function barOf(state: PlayerState, seconds: number): number {
  return Math.floor(seconds / state.barSeconds) + 1;
}
