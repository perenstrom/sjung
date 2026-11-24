import { audibleGain, DEFAULT_GAIN, EQUAL_MIX } from "@/lib/player/mix";
import { type NotationBar, secondsAtTick, tickAtSeconds } from "@/lib/player/notation-bars";
import {
  clampTempo,
  IDLE_SNAPSHOT,
  isRepeating,
  type Loop,
  type Player,
  type PlayerPart,
  playStart,
} from "@/lib/player/player";
import { createSnapshotStore } from "@/lib/player/snapshot-store";
import { SOUND_PROGRAMS } from "@/lib/player/soundfont";

/** A passage of the score in ticks, as alphaTab loops it. */
export type TickRange = { startTick: number; endTick: number };

/**
 * The parts of alphaTab the notation player uses, with the score loaded and
 * drawn. Ticks count from the start of playback, so a bar in a repeat has
 * more than one. Bars of the drawn score are counted from 0.
 */
export type ScoreEngine = {
  play(): void;
  pause(): void;
  /**
   * Moves the playhead to `tick`. alphaTab's worker takes a moment: until it
   * reports the seek, it goes on reporting the playhead from before it.
   */
  seek(tick: number): void;
  /** Plays at `rate` times the score's tempo, at the same pitch. */
  setSpeed(rate: number): void;
  /**
   * Loops `range` until it is `null`. A range also moves the playhead to its
   * start, as a seek. While it loops, alphaTab keeps every seek within it,
   * though it reports the tick it was asked for and counts on from there.
   */
  setLoopRange(range: TickRange | null): void;
  /** Shades bars `first` to `last` of the drawn score, in either order, or none. */
  shadeBars(bars: { first: number; last: number } | null): void;
  /** Sets a track's volume over the file's own: 1 as written, 0 silent. */
  setTrackVolume(track: number, volume: number): void;
  /**
   * Plays every track but percussion with this General MIDI program. alphaTab
   * generates its MIDI again, which rewinds it, so it seeks back to `tick`.
   */
  setProgram(program: number, tick: number): void;
  /** Calls `callback` with the playhead's tick, and whether it is the report of a seek. */
  onPosition(callback: (tick: number, isSeek: boolean) => void): void;
  /** Calls `callback` when alphaTab starts or stops playing, as it does by itself at the end of the score. */
  onPlaying(callback: (playing: boolean) => void): void;
  /** Calls `callback` with the bar a singer tapped in the drawn score. */
  onBarTapped(callback: (bar: number) => void): void;
  /** Stops playing and lets go of alphaTab and the drawn score. */
  destroy(): void;
};

/** A part of the score to mix: one of its tracks. */
export type NotationPart = Pick<PlayerPart, "id" | "name" | "percussion"> & { track: number };

/**
 * Reports that aren't seeks to ignore, at most, while waiting for alphaTab
 * to report a seek, in case it never does. alphaTab reports about every 50 ms.
 */
const MAX_STALE_REPORTS = 40;

/**
 * The notation engine (ADR-0010): alphaTab, with a score loaded, drawn and
 * timed as these `bars`, its `parts` one per track. alphaTab follows the
 * score with its cursor, loops a passage itself, and changes tempo without
 * changing pitch.
 *
 * The playhead is what the player last sought until alphaTab has reported
 * every seek since, so quick steps by bar each measure from where the step
 * before them went. A tap on a bar in the score starts a passage, and a
 * second tap ends it. alphaTab plays nothing outside a passage it repeats, so
 * setting one moves the playhead into it, and seeks stay within it.
 */
export function createNotationPlayer(
  score: ScoreEngine,
  { bars, parts: notationParts }: { bars: readonly NotationBar[]; parts: readonly NotationPart[] },
): Player {
  const parts: PlayerPart[] = notationParts.map(({ id, name, percussion }) => ({ id, name, percussion, ...EQUAL_MIX }));
  const duration = bars.at(-1)?.end ?? 0;
  const store = createSnapshotStore({
    ...IDLE_SNAPSHOT,
    status: "ready",
    duration,
    bars: bars.map(({ start }) => start),
    barNumbers: bars.map(({ number }) => number),
    parts,
  });
  const { update } = store;
  /** Seeks alphaTab has yet to report, and the reports ignored since the first of them. */
  let unreportedSeeks = 0;
  let staleReports = 0;

  function seekTo(seconds: number) {
    const { loop } = store.get();
    const [from, to] = isRepeating(loop) ? [loop.start, loop.end] : [0, duration];
    const position = Math.min(to, Math.max(from, seconds));
    unreportedSeeks += 1;
    score.seek(tickAtSeconds(bars, position));
    update({ position });
  }

  score.onPosition((tick, isSeek) => {
    if (unreportedSeeks > 0) {
      if (isSeek) unreportedSeeks -= 1;
      else staleReports += 1;
      if (unreportedSeeks > 0 && staleReports <= MAX_STALE_REPORTS) return;
      unreportedSeeks = 0;
      staleReports = 0;
    }
    update({ position: secondsAtTick(bars, tick) });
  });
  score.onPlaying((playing) => update({ playing }));
  score.onBarTapped((tapped) => setLoop(tapBar(store.get().loop, tapped, bars, store.get().position)));

  function setLoop(loop: Loop | null) {
    if (isRepeating(loop)) {
      const { position } = store.get();
      score.setLoopRange({ startTick: tickAtSeconds(bars, loop.start), endTick: tickAtSeconds(bars, loop.end) });
      unreportedSeeks += 1;
      update({ loop, position: loop.start });
      // alphaTab has moved the playhead to the passage's start; put it back if it was inside.
      if (position > loop.start && position < loop.end) seekTo(position);
    } else {
      score.setLoopRange(null);
      update({ loop });
    }
    score.shadeBars(shadedBars(loop, bars));
  }

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    play() {
      const start = playStart(store.get().loop, store.get().position);
      if (start !== null) seekTo(start);
      score.play();
      update({ playing: true });
    },
    pause() {
      score.pause();
      update({ playing: false });
    },
    seek: seekTo,
    setTempo(percent) {
      const tempo = clampTempo(percent);
      score.setSpeed(tempo / 100);
      update({ tempo });
    },
    setLoop,
    setPart(partId, change) {
      const mixed = store.get().parts.map((part) => (part.id === partId ? { ...part, ...change } : part));
      notationParts.forEach(({ track }, index) => {
        score.setTrackVolume(track, audibleGain(mixed[index], mixed) / DEFAULT_GAIN);
      });
      update({ parts: mixed });
    },
    setSound(sound) {
      unreportedSeeks += 1;
      score.setProgram(SOUND_PROGRAMS[sound], tickAtSeconds(bars, store.get().position));
      update({ sound });
    },
    destroy() {
      score.destroy();
      store.clear();
    },
  };
}

/**
 * The passage after a tap on bar `tapped` of the score (counted from 0): it
 * starts a passage, or ends the one being marked, as a whole number of bars.
 * A bar played more than once counts where it is played nearest the playhead
 * when it starts a passage, and nearest the passage's start when it ends one.
 */
function tapBar(loop: Loop | null, tapped: number, bars: readonly NotationBar[], position: number): Loop {
  const played = bars.flatMap((bar, index) => (bar.number === tapped + 1 ? [index] : []));
  if (played.length === 0) return loop ?? { start: position, end: null };
  if (loop === null || loop.end !== null) {
    return { start: bars[nearest(played, barIndexAt(bars, position))].start, end: null };
  }
  const first = barIndexAt(bars, loop.start);
  const last = nearest(played, first);
  return { start: bars[Math.min(first, last)].start, end: bars[Math.max(first, last)].end };
}

/** Where the bar `seconds` falls in comes in playing order, counted from 0. */
function barIndexAt(bars: readonly NotationBar[], seconds: number): number {
  return Math.max(
    0,
    bars.findLastIndex(({ start }) => start <= seconds),
  );
}

/** The one of `indexes` nearest `index`, the earlier of two as near. */
function nearest(indexes: readonly number[], index: number): number {
  return indexes.reduce((best, candidate) => (Math.abs(candidate - index) < Math.abs(best - index) ? candidate : best));
}

/** The bars of the score to shade for `loop`: its start bar while it is being marked. */
function shadedBars(loop: Loop | null, bars: readonly NotationBar[]): { first: number; last: number } | null {
  if (loop === null) return null;
  const first = bars[barIndexAt(bars, loop.start)].number - 1;
  if (loop.end === null) return { first, last: first };
  // The bar the passage ends in, not the one starting where it ends.
  const endsIn = bars.findLast(({ start }) => start < (loop.end ?? 0)) ?? bars[0];
  return { first, last: endsIn.number - 1 };
}
