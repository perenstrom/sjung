import type * as AlphaTab from "@coderline/alphatab";

import { fetchBuffer, playThroughSilentSwitch } from "@/lib/player/loading";
import { notationBarsOf } from "@/lib/player/notation-bars";
import { createNotationPlayer, type NotationPart, type TickRange } from "@/lib/player/notation-player";
import { IDLE_SNAPSHOT, partName, type Player } from "@/lib/player/player";
import { SOUND_PROGRAMS } from "@/lib/player/soundfont";

type AlphaTabModule = typeof AlphaTab;
type Score = AlphaTab.model.Score;

/**
 * Where alphaTab, its worker, worklet and Bravura font are copied to in
 * `public` by `scripts/copy-player-assets.mjs`. alphaTab finds its worker
 * and worklet next to itself.
 */
const ALPHATAB_DIRECTORY = "/vendor/alphatab";
const ALPHATAB_MODULE = `${ALPHATAB_DIRECTORY}/alphaTab.min.mjs`;

/** Desktop and tablet width, where the score is drawn at 100 % (Tailwind's `md`). */
const WIDE_QUERY = "(min-width: 768px)";
const WIDE_SCALE = 1;
const PHONE_SCALE = 0.8;

/** How far below the top of the scroll area the current system stays, in pixels. */
const SCROLL_OFFSET = -16;

/** Reports to let through, at most, while waiting for the playhead to come back after the sound changes. */
const MAX_RELOAD_REPORTS = 40;

let alphaTab: Promise<AlphaTabModule> | null = null;

/**
 * alphaTab as a native ES module from `public`, never bundled: the bundler
 * would break how it finds its worker and worklet.
 */
function importAlphaTab(): Promise<AlphaTabModule> {
  alphaTab ??= (
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ ALPHATAB_MODULE) as Promise<AlphaTabModule>
  )
    // A failed download can be tried again by opening the File again.
    .catch((error: unknown) => {
      alphaTab = null;
      throw error;
    });
  return alphaTab;
}

/**
 * Loads the MusicXML or `.mxl` file at `src` into alphaTab, draws it in
 * `element` (scrolled with the cursor in `scrollElement`), played with the
 * player's soundfont at `soundfontSrc`, and returns its player. Only ever
 * imported dynamically, so alphaTab is downloaded only when a notation File
 * is opened. Rejects if anything fails to load, or with an `AbortError` once
 * `signal` aborts, having let go of everything it set up.
 */
export async function loadNotationPlayer({
  src,
  soundfontSrc,
  element,
  scrollElement,
  signal,
}: {
  src: string;
  soundfontSrc: string;
  element: HTMLElement;
  scrollElement: HTMLElement;
  signal: AbortSignal;
}): Promise<Player> {
  const [file, soundfont, at] = await Promise.all([
    fetchBuffer(src, signal),
    fetchBuffer(soundfontSrc, signal),
    importAlphaTab(),
  ]);
  signal.throwIfAborted();

  playThroughSilentSwitch();
  const wide = window.matchMedia(WIDE_QUERY);
  const api = new at.AlphaTabApi(element, {
    core: {
      fontDirectory: `${ALPHATAB_DIRECTORY}/font/`,
      logLevel: at.LogLevel.Warning,
      // Lazy rendering left the first screen blank inside the player's scroll area.
      enableLazyLoading: false,
    },
    display: {
      layoutMode: at.LayoutMode.Page,
      staveProfile: at.StaveProfile.Score,
      scale: wide.matches ? WIDE_SCALE : PHONE_SCALE,
    },
    player: {
      playerMode: at.PlayerMode.EnabledSynthesizer,
      scrollElement,
      scrollMode: at.ScrollMode.Continuous,
      scrollOffsetY: SCROLL_OFFSET,
      // A tap on a bar marks a passage instead (`onBarTapped`).
      enableSeekToClick: false,
      enablePlaybackRangeSelection: false,
    },
  });
  const rescale = () => {
    api.settings.display.scale = wide.matches ? WIDE_SCALE : PHONE_SCALE;
    api.updateSettings();
    api.render();
  };
  wide.addEventListener("change", rescale);
  const destroy = () => {
    wide.removeEventListener("change", rescale);
    api.destroy();
  };

  try {
    const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(file), api.settings);
    playWith(at, score, SOUND_PROGRAMS[IDLE_SNAPSHOT.sound]);
    const ready = untilReady(api, signal);
    api.loadSoundFont(new Uint8Array(soundfont), false);
    // Draws every track (alphaTab draws only the first unless told) and generates the MIDI it plays.
    api.renderScore(
      score,
      score.tracks.map(({ index }) => index),
    );
    await ready;

    const lookups = api.tickCache?.masterBars ?? [];
    return createNotationPlayer(scoreEngine(at, api, score), {
      bars: notationBarsOf(lookups, score.tempo),
      parts: partsOf(score),
    });
  } catch (error) {
    destroy();
    throw error;
  }

  /** alphaTab with `score` loaded, as the notation player drives it. */
  function scoreEngine(at: AlphaTabModule, api: AlphaTab.AlphaTabApi, score: Score) {
    const volumes = new Map<number, number>();
    let range: TickRange | null = null;
    /** While the sound changes: the tick to come back to, and the reports since. */
    let reload: { tick: number; playing: boolean; reports: number } | null = null;
    let onPosition: (tick: number, isSeek: boolean) => void = () => {};
    let onPlaying: (playing: boolean) => void = () => {};

    function applyRange() {
      if (range) {
        const playbackRange = new at.synth.PlaybackRange();
        playbackRange.startTick = range.startTick;
        playbackRange.endTick = range.endTick;
        api.playbackRange = playbackRange;
      } else {
        api.playbackRange = null;
      }
      api.isLooping = range !== null;
    }

    function applyVolume(track: number, volume: number) {
      const heard = score.tracks[track];
      if (heard) api.changeTrackVolume([heard], volume);
    }

    api.playerPositionChanged.on(({ currentTick, isSeek }) => {
      if (reload) {
        // Hold back the playhead alphaTab rewinds to until it is back where it was.
        reload.reports += 1;
        const back = isSeek && Math.abs(currentTick - reload.tick) <= 1;
        if (!back && reload.reports <= MAX_RELOAD_REPORTS) return;
        if (reload.playing) api.play();
        reload = null;
      }
      onPosition(currentTick, isSeek);
    });
    api.playerStateChanged.on(({ state }) => {
      if (!reload) onPlaying(state === at.synth.PlayerState.Playing);
    });
    api.midiLoaded.on(() => {
      if (!reload) return;
      // A new MIDI starts from scratch: give it the mix, tempo and passage again, then go back.
      for (const [track, volume] of volumes) applyVolume(track, volume);
      applyRange();
      api.tickPosition = reload.tick;
    });

    return {
      play: () => api.play(),
      pause: () => api.pause(),
      seek(tick: number) {
        api.tickPosition = tick;
      },
      setSpeed(rate: number) {
        api.playbackSpeed = rate;
      },
      setLoopRange(next: TickRange | null) {
        range = next;
        applyRange();
      },
      shadeBars(bars: { first: number; last: number } | null) {
        const beats = bars && beatsOf(score, Math.min(bars.first, bars.last), Math.max(bars.first, bars.last));
        if (beats) api.highlightPlaybackRange(beats.first, beats.last);
        else api.clearPlaybackRangeHighlight();
      },
      setTrackVolume(track: number, volume: number) {
        volumes.set(track, volume);
        applyVolume(track, volume);
      },
      setProgram(program: number, tick: number) {
        playWith(at, score, program);
        reload = { tick, playing: api.playerState === at.synth.PlayerState.Playing, reports: 0 };
        api.loadMidiForScore();
      },
      onPosition(callback: (tick: number, isSeek: boolean) => void) {
        onPosition = callback;
      },
      onPlaying(callback: (playing: boolean) => void) {
        onPlaying = callback;
      },
      onBarTapped(callback: (bar: number) => void) {
        api.beatMouseUp.on((beat) => {
          if (beat) callback(beat.voice.bar.index);
        });
      },
      destroy,
    };
  }
}

/** Resolves once alphaTab can play the score: the soundfont is loaded and the MIDI generated. */
function untilReady(api: AlphaTab.AlphaTabApi, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const stops = [api.playerReady.on(() => finish(resolve)), api.error.on((error) => finish(() => reject(error)))];
    const abort = () => finish(() => reject(signal.reason));
    signal.addEventListener("abort", abort);
    function finish(settle: () => void) {
      for (const stop of stops) stop();
      signal.removeEventListener("abort", abort);
      settle();
    }
  });
}

/**
 * The parts of a score: one per track, named as in the file, or "Stämma n"
 * after its place when it has no name. A track whose staves are all
 * percussion is percussion.
 */
function partsOf(score: Score): NotationPart[] {
  return score.tracks.map((track, index) => ({
    id: `track-${index}`,
    name: partName(track.name, index),
    percussion: isPercussion(track),
    track: index,
  }));
}

/** Whether every staff of `track` is percussion, so it plays drums and keeps its own sounds. */
function isPercussion(track: AlphaTab.model.Track): boolean {
  return track.staves.every((staff) => staff.isPercussion);
}

/** The first beat of bar `first` and the last of bar `last` in the score's first staff, to shade them. */
function beatsOf(score: Score, first: number, last: number) {
  const bars = score.tracks[0]?.staves[0]?.bars;
  const firstBeat = bars?.[first]?.voices[0]?.beats[0];
  const lastBeat = bars?.[last]?.voices[0]?.beats.at(-1);
  return firstBeat && lastBeat ? { first: firstBeat, last: lastBeat } : null;
}

/**
 * Plays every track but percussion with `program`, so the file's own
 * instruments don't pick sounds the trimmed soundfont doesn't have. The
 * MusicXML import also puts an instrument change on each track's first beat,
 * which would override the track's program, so those change too.
 */
function playWith(at: AlphaTabModule, score: Score, program: number) {
  for (const track of score.tracks) {
    if (isPercussion(track)) continue;
    track.playbackInfo.program = program;
    for (const beat of track.staves.flatMap((staff) =>
      staff.bars.flatMap((bar) => bar.voices.flatMap((voice) => voice.beats)),
    )) {
      for (const automation of beat.automations) {
        if (automation.type === at.model.AutomationType.Instrument) automation.value = program;
      }
    }
  }
}
