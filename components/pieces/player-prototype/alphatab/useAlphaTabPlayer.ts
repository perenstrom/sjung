"use client";

// PROTOTYPE (PER-464): the real player behind variant T. Loads a notation
// file into alphaTab, optionally splits shared staves into per-voice parts,
// and exposes the same play / tempo / A–B / mix controls the fake player in
// usePlayerState has. Everything it learns is kept in `debug` for the
// prototype's "Motor" panel.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { Part } from "../fixtures";
import type { Channel, Preset } from "../usePlayerState";
import { ASSETS, installOutputTap, loadAlphaTab, type AlphaTab, type Api, type Beat, type Score } from "./engine";
import { prepareFile, type PreparedFile } from "./prepareFile";
import { splitVoices, type SplitResult, type TrackRole } from "./splitVoices";

export type Options = {
  split: boolean;
  hyphens: boolean;
  orderVerses: boolean;
  shortBars: boolean;
  scale: number;
  layout: "page" | "horizontal";
  sound: "choir" | "piano";
};

export type BarLoop = { a: number; b: number | null } | null;

type TrackInfo = {
  index: number;
  name: string;
  role: TrackRole;
  drawn: boolean;
  channel: number;
  program: number;
  voicesPerBar: number;
};

export type Debug = {
  timings: Record<string, number>;
  tracks: TrackInfo[];
  warnings: string[];
  file?: Omit<PreparedFile, "bytes">;
  bars: number;
  tempo: number | null;
  tick: number;
  range: { startTick: number; endTick: number } | null;
  repeats: string[];
  log: string[];
};

const PROGRAM = { choir: 52, piano: 0 } as const;
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
  const [currentBar, setCurrentBar] = useState(1);
  const [tempo, setTempoState] = useState(100);
  const [loop, setLoopState] = useState<BarLoop>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [channels, setChannels] = useState<Record<string, Channel>>({});
  const [myPart, setMyPart] = useState<string | null>(null);
  const [preset, setPresetState] = useState<Preset>("all");
  const [debug, setDebug] = useState<Debug>({
    timings: {},
    tracks: [],
    warnings: [],
    bars: 0,
    tempo: null,
    tick: 0,
    range: null,
    repeats: [],
    log: [],
  });

  const apiRef = useRef<Api | null>(null);
  const scoreObj = useRef<Score | null>(null);
  const split = useRef<SplitResult | null>(null);
  const loopRef = useRef<BarLoop>(null);
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const log = (line: string) =>
    setDebug((d) => ({ ...d, log: [...d.log.slice(-30), `${(performance.now() / 1000).toFixed(1)}s ${line}`] }));
  const time = (key: string, ms: number) => setDebug((d) => ({ ...d, timings: { ...d.timings, [key]: Math.round(ms) } }));

  // ------------------------------------------------------------ load & render
  useEffect(() => {
    const el = scoreRef.current;
    if (!el) return;
    let cancelled = false;
    let api: Api | null = null;
    const t0 = performance.now();
    setStatus("loading");
    setError(null);
    setPlayerReady(false);
    setPlaying(false);
    setPosition(0);
    setLoopState(null);
    loopRef.current = null;

    (async () => {
      installOutputTap();
      const at = await loadAlphaTab();
      if (cancelled) return;
      time("load alphaTab", performance.now() - t0);
      api = new at.AlphaTabApi(el, {
        // Lazy loading left the first screen blank inside our scroll container
        // until the user scrolled; draw everything up front instead.
        core: { fontDirectory: `${ASSETS}/font/`, logLevel: at.LogLevel.Warning, enableLazyLoading: false },
        display: {
          layoutMode: options.layout === "page" ? at.LayoutMode.Page : at.LayoutMode.Horizontal,
          staveProfile: at.StaveProfile.Score,
          scale: options.scale,
        },
        player: {
          playerMode: at.PlayerMode.EnabledSynthesizer,
          soundFont: `${ASSETS}/soundfont/sonivox.sf3`,
          scrollElement: scrollRef.current ?? undefined,
          scrollMode: at.ScrollMode.Continuous,
          scrollOffsetY: -60,
          enableSeekToClick: false,
          enablePlaybackRangeSelection: false,
        },
      });
      apiRef.current = api;
      (window as unknown as { __at?: unknown }).__at = { api, at, get score() { return scoreObj.current; }, get split() { return split.current; } };
      wire(at, api, t0);

      const file = await prepareFile(url, {
        hyphens: options.hyphens,
        orderVerses: options.orderVerses,
        shortBars: options.shortBars,
      });
      if (cancelled) return;
      time("fetch file", file.fetchMs);
      const { bytes, ...fileInfo } = file;

      let t = performance.now();
      let score = at.importer.ScoreLoader.loadScoreFromBytes(bytes, api.settings);
      time("parse", performance.now() - t);
      for (const line of fixJumps(at, score)) log(line);

      t = performance.now();
      const result = options.split
        ? splitVoices(at, score, api.settings)
        : {
            score,
            roles: score.tracks.map(() => ({ kind: "plain" }) as TrackRole),
            display: score.tracks.map((_, i) => i),
            channels: score.tracks.map((tr) => ({ track: tr.index, channel: tr.playbackInfo.primaryChannel })),
            warnings: [],
          };
      if (options.split) time("split voices", performance.now() - t);
      score = result.score;
      for (const tr of score.tracks) tr.playbackInfo.program = PROGRAM[options.sound];
      scoreObj.current = score;
      split.current = result;

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
      setDebug((d) => ({
        ...d,
        file: fileInfo,
        warnings: result.warnings,
        bars: score.masterBars.length,
        tempo: score.tempo,
        repeats: describeRepeats(score),
        tracks: score.tracks.map((tr) => ({
          index: tr.index,
          name: tr.name,
          role: result.roles[tr.index],
          drawn: result.display.includes(tr.index),
          channel: tr.playbackInfo.primaryChannel,
          program: tr.playbackInfo.program,
          voicesPerBar: Math.max(...tr.staves[0].bars.map((b) => b.voices.length)),
        })),
      }));

      setStatus("rendering");
      t = performance.now();
      api.renderFinished.on(() => time("render", performance.now() - t));
      api.renderScore(score, result.display);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    });

    function wire(at: AlphaTab, a: Api, start: number) {
      a.error.on((e) => {
        setError(e.message);
        log(`error: ${e.message}`);
      });
      a.postRenderFinished.on(() => setStatus("ready"));
      a.soundFontLoaded.on(() => time("soundfont", performance.now() - start));
      a.playerReady.on(() => {
        time("player ready", performance.now() - start);
        setPlayerReady(true);
      });
      a.midiLoaded.on((e) => {
        setDuration(e.endTime / 1000);
        applyMix(a, channelsRef.current);
        log(`midi loaded: ${(e.endTime / 1000).toFixed(1)} s, ${e.endTick} ticks`);
      });
      a.playerStateChanged.on((e) => setPlaying(e.state === at.synth.PlayerState.Playing));
      a.playerPositionChanged.on((e) => {
        setPosition(e.currentTime / 1000);
        setDuration(e.endTime / 1000);
        setDebug((d) => (Math.abs(d.tick - e.currentTick) > 240 ? { ...d, tick: e.currentTick } : d));
      });
      a.activeBeatsChanged.on((e) => {
        const beat = e.activeBeats[0];
        if (beat) setCurrentBar(beat.voice.bar.index + 1);
      });
      a.playbackRangeChanged.on((e) =>
        setDebug((d) => ({
          ...d,
          range: e.playbackRange ? { startTick: e.playbackRange.startTick, endTick: e.playbackRange.endTick } : null,
        }))
      );
      a.beatMouseUp.on((beat) => {
        if (beat) tapBar(a, beat);
      });
    }

    return () => {
      cancelled = true;
      api?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the file or render options change
  }, [url, options.split, options.hyphens, options.orderVerses, options.shortBars, options.scale, options.layout]);

  // ----------------------------------------------------------- sound switch
  useEffect(() => {
    const api = apiRef.current;
    const score = scoreObj.current;
    if (!api || !score) return;
    for (const tr of score.tracks) tr.playbackInfo.program = PROGRAM[options.sound];
    api.loadMidiForScore();
    setDebug((d) => ({ ...d, tracks: d.tracks.map((t) => ({ ...t, program: PROGRAM[options.sound] })) }));
  }, [options.sound]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyMix reads refs
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
  /** Tap a bar: the first tap marks the start, the second the end. */
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
    tempo,
    setTempo: (t: number) => {
      const next = Math.max(50, Math.min(120, Math.round(t)));
      setTempoState(next);
      if (apiRef.current) apiRef.current.playbackSpeed = next / 100;
    },
    loop,
    setLoop: (l: BarLoop) => setLoop(l),
    parts,
    channels,
    setChannel,
    audible,
    myPart,
    chooseMyPart,
    preset,
    applyPreset,
    debug,
  };
}

export type AlphaTabPlayerState = ReturnType<typeof useAlphaTabPlayer>;

/**
 * alphaTab's MusicXML importer turns every <sound dalsegno/dacapo> into a plain
 * D.S./D.C., which never takes a To Coda or stops at Fine. Upgrade them to the
 * "al Coda" / "al Fine" forms when the score has a To Coda / Fine mark.
 */
function fixJumps(at: AlphaTab, score: Score): string[] {
  const D = at.model.Direction;
  const has = (d: number) => score.masterBars.some((m) => m.directions?.has(d));
  const toCoda = has(D.JumpDaCoda);
  const fine = has(D.TargetFine);
  const out: string[] = [];
  for (const m of score.masterBars) {
    const swap = (from: number, to: number, label: string) => {
      if (!m.directions?.has(from)) return;
      m.directions.delete(from);
      m.addDirection(to);
      out.push(`takt ${m.index + 1}: ${label}`);
    };
    if (toCoda) {
      swap(D.JumpDalSegno, D.JumpDalSegnoAlCoda, "D.S. → D.S. al Coda");
      swap(D.JumpDaCapo, D.JumpDaCapoAlCoda, "D.C. → D.C. al Coda");
    } else if (fine) {
      swap(D.JumpDalSegno, D.JumpDalSegnoAlFine, "D.S. → D.S. al Fine");
      swap(D.JumpDaCapo, D.JumpDaCapoAlFine, "D.C. → D.C. al Fine");
    }
  }
  return out;
}

function describeRepeats(score: Score): string[] {
  const out: string[] = [];
  for (const mb of score.masterBars) {
    const bits: string[] = [];
    if (mb.isRepeatStart) bits.push("|:");
    if (mb.repeatCount > 0) bits.push(`:| x${mb.repeatCount}`);
    if (mb.alternateEndings) bits.push(`volta ${mb.alternateEndings.toString(2)}`);
    if (mb.directions?.size) bits.push(`dir ${[...mb.directions].join(",")}`);
    if (mb.tempoAutomations?.length) bits.push(`♩=${mb.tempoAutomations.map((a) => a.value).join("/")}`);
    if (mb.section) bits.push(`[${mb.section.text}]`);
    if (bits.length) out.push(`takt ${mb.index + 1}: ${bits.join(" ")}`);
  }
  return out;
}
