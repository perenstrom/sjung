"use client";

// PROTOTYPE: the real player behind the desktop variants (PER-463). Loads a
// notation file into alphaTab with the fix-ups PER-464 settled on (verses
// sorted, short bars marked implicit, D.S./D.C. upgraded, every shared staff
// split into per-voice parts), and exposes play / tempo / A–B / mix controls
// in the same shape as the fake player in usePlayerState.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { Part } from "../fixtures";
import type { Channel, Preset } from "../usePlayerState";
import { ASSETS, loadAlphaTab, type AlphaTab, type Api, type Beat, type Score } from "./engine";
import { prepareFile } from "./prepareFile";
import { splitVoices, type SplitResult } from "./splitVoices";

/** How the score is drawn and follows the cursor: the questions PER-463 is settling. */
export type Options = {
  scale: number;
  layout: "page" | "horizontal";
  scroll: "continuous" | "offscreen" | "smooth";
  /** Fixed bars per row in page layout; -1 lets alphaTab decide. */
  barsPerRow: number;
};

export type BarLoop = { a: number; b: number | null } | null;

/** General MIDI 53 "choir aahs": the Kör sound. */
const CHOIR = 52;
const BASE: Channel = { volume: 80, muted: false, solo: false };

export function useAlphaTabPlayer({
  url,
  options,
  scoreRef,
  scrollRef,
}: {
  url: string;
  options: Options;
  scoreRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const [status, setStatus] = useState<"loading" | "rendering" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [endTick, setEndTick] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [tempo, setTempoState] = useState(100);
  const [bpm, setBpm] = useState<number | null>(null);
  const [loop, setLoopState] = useState<BarLoop>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [channels, setChannels] = useState<Record<string, Channel>>({});
  const [myPart, setMyPart] = useState<string | null>(null);
  const [preset, setPresetState] = useState<Preset>("all");

  const apiRef = useRef<Api | null>(null);
  const scoreObj = useRef<Score | null>(null);
  const split = useRef<SplitResult | null>(null);
  const loopRef = useRef<BarLoop>(null);
  /** Where the last bar step sent the playhead; alphaTab's own tickPosition lags behind its worker. */
  const pendingTick = useRef<{ tick: number; at: number } | null>(null);
  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  // ------------------------------------------------------------ load & render
  useEffect(() => {
    const el = scoreRef.current;
    if (!el) return;
    let cancelled = false;
    let api: Api | null = null;
    setStatus("loading");
    setError(null);
    setPlayerReady(false);
    setPlaying(false);
    setPosition(0);
    setLoopState(null);
    loopRef.current = null;

    (async () => {
      const at = await loadAlphaTab();
      if (cancelled) return;
      api = new at.AlphaTabApi(el, {
        // Lazy loading left the first screen blank inside our scroll container
        // until the user scrolled; draw everything up front instead.
        core: { fontDirectory: `${ASSETS}/font/`, logLevel: at.LogLevel.Warning, enableLazyLoading: false },
        display: {
          layoutMode: options.layout === "page" ? at.LayoutMode.Page : at.LayoutMode.Horizontal,
          staveProfile: at.StaveProfile.Score,
          scale: options.scale,
          barsPerRow: options.barsPerRow,
        },
        player: {
          playerMode: at.PlayerMode.EnabledSynthesizer,
          soundFont: `${ASSETS}/soundfont/sonivox.sf3`,
          scrollElement: scrollRef.current ?? undefined,
          scrollMode:
            options.scroll === "offscreen"
              ? at.ScrollMode.OffScreen
              : options.scroll === "smooth"
                ? at.ScrollMode.Smooth
                : at.ScrollMode.Continuous,
          scrollOffsetY: -60,
          enableSeekToClick: false,
          enablePlaybackRangeSelection: false,
        },
      });
      apiRef.current = api;
      // For poking at the player from the browser console.
      (window as unknown as { __at?: unknown }).__at = { api, at, get score() { return scoreObj.current; } };
      wire(at, api);

      const { bytes } = await prepareFile(url, { hyphens: false, orderVerses: true, shortBars: true });
      if (cancelled) return;
      let score = at.importer.ScoreLoader.loadScoreFromBytes(bytes, api.settings);
      fixJumps(at, score);
      const result = splitVoices(at, score, api.settings);
      score = result.score;
      setProgram(at, score, CHOIR);
      scoreObj.current = score;
      split.current = result;
      setBpm(score.tempo);

      const heard = score.tracks.filter((tr) => result.roles[tr.index].kind !== "display");
      const nextParts: Part[] = heard.map((tr) => {
        const role = result.roles[tr.index];
        return {
          id: String(tr.index),
          label: tr.name || `Stämma ${tr.index + 1}`,
          kind: "voice",
          staff: role.kind === "voice" ? score.tracks[role.of].name : undefined,
        };
      });
      setParts(nextParts);
      setChannels(Object.fromEntries(nextParts.map((p) => [p.id, BASE])));
      setMyPart(null);
      setPresetState("all");

      setStatus("rendering");
      api.renderScore(score, result.display);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    });

    function wire(at: AlphaTab, a: Api) {
      a.error.on((e) => setError(e.message));
      a.postRenderFinished.on(() => setStatus("ready"));
      a.playerReady.on(() => setPlayerReady(true));
      a.midiLoaded.on((e) => {
        setDuration(e.endTime / 1000);
        setEndTick(e.endTick);
        applyMix(a, channelsRef.current);
      });
      a.playerStateChanged.on((e) => setPlaying(e.state === at.synth.PlayerState.Playing));
      a.playerPositionChanged.on((e) => {
        setPosition(e.currentTime / 1000);
        setDuration(e.endTime / 1000);
        // Also while paused (activeBeatsChanged only fires while playing).
        const played = (a.tickCache?.masterBars ?? []).find((b) => e.currentTick >= b.start && e.currentTick < b.end);
        if (played) setCurrentBar(played.masterBar.index + 1);
      });
      a.activeBeatsChanged.on((e) => {
        const beat = e.activeBeats[0];
        if (beat) setCurrentBar(beat.voice.bar.index + 1);
      });
      a.beatMouseUp.on((beat) => {
        if (beat) tapBar(a, beat);
      });
    }

    return () => {
      cancelled = true;
      api?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the file or how it is drawn changes
  }, [url, options.scale, options.layout, options.scroll, options.barsPerRow]);

  // ---------------------------------------------------------------- mixing
  function applyMix(api: Api, chs: Record<string, Channel>) {
    const score = scoreObj.current;
    const result = split.current;
    if (!score || !result) return;
    const displays = score.tracks.filter((tr) => result.roles[tr.index].kind === "display");
    if (displays.length) api.changeTrackMute(displays, true);
    for (const [id, c] of Object.entries(chs)) {
      const tr = score.tracks[Number(id)];
      if (!tr) continue;
      api.changeTrackMute([tr], c.muted);
      api.changeTrackSolo([tr], c.solo);
      api.changeTrackVolume([tr], c.volume / 80);
    }
  }

  useEffect(() => {
    if (apiRef.current && playerReady) applyMix(apiRef.current, channels);
  }, [channels, playerReady]);

  function setChannel(id: string, patch: Partial<Channel>) {
    setChannels((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setPresetState("all");
  }

  function applyPreset(next: Preset, part = myPart) {
    setPresetState(next);
    setChannels(
      Object.fromEntries(
        parts.map((p) => {
          const mine = p.id === part;
          if (!part || next === "all") return [p.id, BASE];
          if (next === "lift") return [p.id, { ...BASE, volume: mine ? 100 : 35 }];
          if (next === "without") return [p.id, { ...BASE, muted: mine }];
          return [p.id, { ...BASE, muted: !mine }];
        })
      )
    );
  }

  function chooseMyPart(id: string | null) {
    setMyPart(id);
    applyPreset(id ? (preset === "all" ? "lift" : preset) : "all", id);
  }

  const anySolo = Object.values(channels).some((c) => c.solo);
  const audible = useMemo(
    () =>
      Object.fromEntries(
        parts.map((p) => {
          const c = channels[p.id] ?? BASE;
          return [p.id, c.muted || (anySolo && !c.solo) ? 0 : c.volume];
        })
      ),
    [channels, anySolo, parts]
  );

  // ------------------------------------------------------------- A–B loop
  /** Click a bar: the first click marks the start, the second the end. */
  function tapBar(api: Api, beat: Beat) {
    const bar = beat.voice.bar;
    const l = loopRef.current;
    let next: BarLoop;
    if (!l || l.b !== null) next = { a: bar.index, b: null };
    else next = bar.index >= l.a ? { a: l.a, b: bar.index } : { a: bar.index, b: l.a };
    setLoop(next, api, beat);
  }

  function setLoop(next: BarLoop, api = apiRef.current, anyBeat?: Beat) {
    loopRef.current = next;
    setLoopState(next);
    if (!api) return;
    if (!next) {
      api.clearPlaybackRangeHighlight();
      api.playbackRange = null;
      api.isLooping = false;
      return;
    }
    const staff = anyBeat?.voice.bar.staff ?? scoreObj.current?.tracks[0].staves[0];
    if (!staff) return;
    const first = staff.bars[next.a].voices[0].beats[0];
    const lastBar = staff.bars[next.b ?? next.a].voices[0].beats;
    const last = lastBar[lastBar.length - 1];
    api.highlightPlaybackRange(first, last);
    if (next.b !== null) {
      api.applyPlaybackRangeFromHighlight();
      api.isLooping = true;
      api.tickPosition = api.playbackRange?.startTick ?? api.tickPosition;
    }
  }

  // --------------------------------------------------------- keyboard helpers
  /** The tick to measure from: a bar step still on its way to the worker, else alphaTab's position. */
  function nowTick(api: Api) {
    const p = pendingTick.current;
    return p && performance.now() - p.at < 500 ? p.tick : api.tickPosition;
  }

  /** The bar being played (in play order, so repeats count), as an index into the tick lookup. */
  function playedBar(api: Api) {
    const bars = api.tickCache?.masterBars ?? [];
    const tick = nowTick(api);
    let i = bars.findIndex((b) => tick >= b.start && tick < b.end);
    if (i < 0) i = tick <= 0 ? 0 : bars.length - 1;
    return { bars, i };
  }

  /** Move the playhead whole bars; one step back first returns to the bar's start. */
  function stepBar(delta: number) {
    const api = apiRef.current;
    if (!api) return;
    const { bars, i } = playedBar(api);
    if (!bars.length) return;
    let target = i + delta;
    if (delta < 0 && nowTick(api) - bars[i].start > 240) target += 1;
    const to = bars[Math.max(0, Math.min(bars.length - 1, target))];
    pendingTick.current = { tick: to.start, at: performance.now() };
    api.tickPosition = to.start;
    setCurrentBar(to.masterBar.index + 1);
  }

  /** Set A (start) or B (end) of the passage at the bar under the playhead. */
  function markAt(which: "a" | "b") {
    const api = apiRef.current;
    if (!api) return;
    const { bars, i } = playedBar(api);
    const bar = bars[i]?.masterBar.index;
    if (bar == null) return;
    const l = loopRef.current;
    if (which === "a") setLoop({ a: bar, b: l?.b != null && l.b >= bar ? l.b : null });
    else if (!l) setLoop({ a: bar, b: bar });
    else setLoop({ a: Math.min(l.a, bar), b: Math.max(l.a, bar) });
  }

  /** The passage as fractions of the whole piece, for shading a seek bar. */
  function loopFractions(): { from: number; to: number | null } | null {
    const api = apiRef.current;
    const score = scoreObj.current;
    const l = loopRef.current;
    if (!api?.tickCache || !score || !l || !endTick) return null;
    const lookup = api.tickCache;
    const from = lookup.getMasterBarStart(score.masterBars[l.a]) / endTick;
    if (l.b === null) return { from, to: null };
    return { from, to: lookup.getMasterBar(score.masterBars[l.b]).end / endTick };
  }

  return {
    status,
    error,
    playerReady,
    playing,
    togglePlay: () => apiRef.current?.playPause(),
    position,
    duration,
    seek: (s: number) => {
      if (apiRef.current) apiRef.current.timePosition = s * 1000;
    },
    currentBar,
    bpm,
    tempo,
    setTempo: (t: number) => {
      const next = Math.max(50, Math.min(120, Math.round(t)));
      setTempoState(next);
      if (apiRef.current) apiRef.current.playbackSpeed = next / 100;
    },
    loop,
    setLoop: (l: BarLoop) => setLoop(l),
    loopFractions,
    stepBar,
    markAt,
    toStart: () => {
      const api = apiRef.current;
      if (api) api.tickPosition = api.playbackRange?.startTick ?? 0;
    },
    parts,
    channels,
    setChannel,
    audible,
    myPart,
    chooseMyPart,
    preset,
    applyPreset,
  };
}

export type AlphaTabPlayerState = ReturnType<typeof useAlphaTabPlayer>;

/**
 * Sets every track's sound. The MusicXML importer also puts an instrument
 * change on each track's first beat (from <midi-program>), which overrides
 * playbackInfo.program when the MIDI is generated, so rewrite those too.
 */
function setProgram(at: AlphaTab, score: Score, program: number) {
  const instrument = at.model.AutomationType.Instrument;
  for (const track of score.tracks) {
    track.playbackInfo.program = program;
    for (const staff of track.staves)
      for (const bar of staff.bars)
        for (const voice of bar.voices)
          for (const beat of voice.beats)
            for (const a of beat.automations ?? []) if (a.type === instrument) a.value = program;
  }
}

/**
 * alphaTab's MusicXML importer turns every <sound dalsegno/dacapo> into a plain
 * D.S./D.C., which never takes a To Coda or stops at Fine. Upgrade them to the
 * "al Coda" / "al Fine" forms when the score has a To Coda / Fine mark.
 */
function fixJumps(at: AlphaTab, score: Score) {
  const D = at.model.Direction;
  const has = (d: number) => score.masterBars.some((m) => m.directions?.has(d));
  const toCoda = has(D.JumpDaCoda);
  const fine = has(D.TargetFine);
  for (const m of score.masterBars) {
    const swap = (from: number, to: number) => {
      if (!m.directions?.has(from)) return;
      m.directions.delete(from);
      m.addDirection(to);
    };
    if (toCoda) {
      swap(D.JumpDalSegno, D.JumpDalSegnoAlCoda);
      swap(D.JumpDaCapo, D.JumpDaCapoAlCoda);
    } else if (fine) {
      swap(D.JumpDalSegno, D.JumpDalSegnoAlFine);
      swap(D.JumpDaCapo, D.JumpDaCapoAlFine);
    }
  }
}
