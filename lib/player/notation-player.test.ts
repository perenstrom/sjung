import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_GAIN } from "@/lib/player/mix";
import type { NotationBar } from "@/lib/player/notation-bars";
import { createNotationPlayer, type NotationPart, type ScoreEngine } from "@/lib/player/notation-player";
import { clampTempo, type Player } from "@/lib/player/player";
import { createPlayerControls } from "@/lib/player/player-controls";
import { SOUND_PROGRAMS } from "@/lib/player/soundfont";

/** A 4/4 bar in alphaTab's ticks. */
const BAR = 3840;

/**
 * Bars 1–3 with bars 1–2 repeated, at two seconds a bar: played as 1, 2, 1,
 * 2, 3, ending at 10 s.
 */
const BARS: NotationBar[] = [1, 2, 1, 2, 3].map((number, index) => ({
  number,
  startTick: index * BAR,
  endTick: (index + 1) * BAR,
  start: index * 2,
  end: (index + 1) * 2,
}));

const PARTS: NotationPart[] = [
  { id: "track-0", name: "Sopran", percussion: false, track: 0 },
  { id: "track-1", name: "Alt", percussion: false, track: 1 },
];

/**
 * Stands in for alphaTab, the boundary the notation player drives: it plays
 * nothing. Like alphaTab's worker, it reports a position only when a test
 * says so (`report`), and reports each seek after it, marked as one.
 */
class FakeScore implements ScoreEngine {
  playing = false;
  /** Where the last seek sent the playhead, which alphaTab has yet to report. */
  tick = 0;
  speed = 1;
  range: { startTick: number; endTick: number } | null = null;
  shaded: { first: number; last: number } | null = null;
  trackVolumes = new Map<number, number>();
  program = SOUND_PROGRAMS.piano;
  destroyed = false;
  private position: ((tick: number, isSeek: boolean) => void) | null = null;
  private playingChanged: ((playing: boolean) => void) | null = null;
  private tapped: ((bar: number) => void) | null = null;
  private seeks: number[] = [];

  play() {
    this.playing = true;
    this.playingChanged?.(true);
  }
  pause() {
    this.playing = false;
    this.playingChanged?.(false);
  }
  /**
   * Like alphaTab, keeps the playhead within a range it loops, but reports
   * the tick it was asked for.
   */
  seek(tick: number) {
    this.tick = this.range ? Math.min(this.range.endTick, Math.max(this.range.startTick, tick)) : tick;
    this.seeks.push(tick);
  }
  setSpeed(rate: number) {
    this.speed = rate;
  }
  setLoopRange(range: { startTick: number; endTick: number } | null) {
    this.range = range;
    // alphaTab moves the playhead to the start of a range it is given.
    if (range) this.seek(range.startTick);
  }
  shadeBars(bars: { first: number; last: number } | null) {
    this.shaded = bars;
  }
  setTrackVolume(track: number, volume: number) {
    this.trackVolumes.set(track, volume);
  }
  setProgram(program: number, tick: number) {
    this.program = program;
    this.seek(tick);
  }
  onPosition(callback: (tick: number, isSeek: boolean) => void) {
    this.position = callback;
  }
  onPlaying(callback: (playing: boolean) => void) {
    this.playingChanged = callback;
  }
  onBarTapped(callback: (bar: number) => void) {
    this.tapped = callback;
  }
  destroy() {
    this.destroyed = true;
  }

  /** Reports the seeks the worker has caught up with, oldest first. */
  catchUp() {
    for (const tick of this.seeks.splice(0)) this.position?.(tick, true);
  }
  /** Reports playback reaching `tick`. */
  report(tick: number) {
    this.position?.(tick, false);
  }
  /** A tap on bar `index` of the drawn score, counted from 0. */
  tap(index: number) {
    this.tapped?.(index);
  }
}

let score: FakeScore;
let player: Player;

beforeEach(() => {
  score = new FakeScore();
  player = createNotationPlayer(score, { bars: BARS, parts: PARTS });
});

describe("createNotationPlayer", () => {
  it("is ready with the score's bars, as numbered in it, its length and a part per track", () => {
    expect(player.getSnapshot()).toMatchObject({
      status: "ready",
      duration: 10,
      bars: [0, 2, 4, 6, 8],
      barNumbers: [1, 2, 1, 2, 3],
      parts: [
        { id: "track-0", name: "Sopran", percussion: false, gain: DEFAULT_GAIN, muted: false, solo: false },
        { id: "track-1", name: "Alt", percussion: false, gain: DEFAULT_GAIN, muted: false, solo: false },
      ],
    });
  });

  it("follows the playhead alphaTab reports while playing", () => {
    player.play();
    score.report(BAR * 1.5);

    expect(score.playing).toBe(true);
    expect(player.getSnapshot()).toMatchObject({ playing: true, position: 3 });

    player.pause();
    expect(player.getSnapshot().playing).toBe(false);
  });

  it("stops playing when alphaTab does, as at the end of the score", () => {
    player.play();
    score.pause();

    expect(player.getSnapshot().playing).toBe(false);
  });

  it("seeks by time, within the score", () => {
    player.seek(5);
    expect(score.tick).toBe(BAR * 2.5);
    expect(player.getSnapshot().position).toBe(5);

    player.seek(99);
    expect(score.tick).toBe(BAR * 5);
    expect(player.getSnapshot().position).toBe(10);
  });

  it("steps bar by bar from where the last step went, before alphaTab has caught up", () => {
    const controls = createPlayerControls(player, { scoreTakesTaps: true });
    const step = () => controls.run({ type: "stepBars", by: 1 });

    step();
    score.report(0); // From before the step: the worker hasn't seen it yet.
    step();
    step();
    score.catchUp();

    expect(player.getSnapshot().position).toBe(6);
    expect(score.tick).toBe(BAR * 3);
  });

  it("follows the playhead again once alphaTab has caught up with the last seek", () => {
    player.play();
    player.seek(4);
    score.report(BAR * 0.5);
    expect(player.getSnapshot().position).toBe(4);

    score.catchUp();
    score.report(BAR * 2.25);
    expect(player.getSnapshot().position).toBe(4.5);
  });

  it("plays at the kept tempo through alphaTab's playback speed", () => {
    player.setTempo(200);

    expect(score.speed).toBe(clampTempo(200) / 100);
    expect(player.getSnapshot().tempo).toBe(clampTempo(200));
  });

  it("repeats a passage through alphaTab's own passage, shading its bars in the score, and keeps the playhead where it is", () => {
    player.seek(3);
    player.setPassage({ start: 2, end: 6 });
    score.catchUp();

    expect(score.range).toEqual({ startTick: BAR, endTick: BAR * 3 });
    expect(score.shaded).toEqual({ first: 1, last: 0 });
    expect(score.tick).toBe(BAR * 1.5);
    expect(player.getSnapshot()).toMatchObject({ passage: { start: 2, end: 6 }, position: 3 });
  });

  it.each([
    { position: 1, case: "ahead of the playhead" },
    { position: 9, case: "behind the playhead" },
  ])("moves the playhead to the start of a passage set $case, where alphaTab plays it from", ({ position }) => {
    player.seek(position);
    player.play();
    player.setPassage({ start: 4, end: 8 });
    score.catchUp();

    expect(score.tick).toBe(BAR * 2);
    expect(player.getSnapshot().position).toBe(4);
  });

  it("keeps a seek within the passage while it repeats, as alphaTab plays only that", () => {
    player.setPassage({ start: 4, end: 8 });
    player.seek(1);
    score.catchUp();

    expect(score.tick).toBe(BAR * 2);
    expect(player.getSnapshot().position).toBe(4);

    player.seek(9);
    expect(player.getSnapshot().position).toBe(8);
  });

  it("shades only the start bar while a passage is being marked, and nothing once repeating stops", () => {
    player.setPassage({ start: 2, end: null });
    expect(score.range).toBeNull();
    expect(score.shaded).toEqual({ first: 1, last: 1 });

    player.setPassage(null);
    expect(score.shaded).toBeNull();
  });

  it("plays a passage from its start when the playhead is outside it", () => {
    player.setPassage({ start: 2, end: 6 });
    player.seek(8);
    player.play();

    expect(score.tick).toBe(BAR);
    expect(player.getSnapshot().position).toBe(2);
  });

  it.each<{ taps: number[]; position: number; passage: { start: number; end: number | null } }>([
    { taps: [1], position: 0, passage: { start: 2, end: null } },
    { taps: [0, 1], position: 0, passage: { start: 0, end: 4 } },
    { taps: [1, 0], position: 0, passage: { start: 0, end: 4 } },
    // The second time round bars 1–2 are played from 4 s; the tap picks the time nearest the playhead.
    { taps: [0, 2], position: 5, passage: { start: 4, end: 10 } },
    { taps: [0], position: 7, passage: { start: 4, end: null } },
  ])("sets the passage from taps on bars $taps of the score at $position s", ({ taps, position, passage }) => {
    player.seek(position);
    for (const tap of taps) score.tap(tap);

    expect(player.getSnapshot().passage).toEqual(passage);
  });

  it("starts a new passage with a tap once one is set", () => {
    score.tap(0);
    score.tap(1);
    score.tap(2);

    expect(player.getSnapshot().passage).toEqual({ start: 8, end: null });
  });

  it("mixes each part through its track's volume, the default volume being the file's own", () => {
    player.setPart("track-1", { gain: 0.4 });
    player.setPart("track-0", { solo: true });

    expect(score.trackVolumes.get(0)).toBe(1);
    expect(score.trackVolumes.get(1)).toBe(0);
    expect(player.getSnapshot().parts.map(({ gain, solo }) => ({ gain, solo }))).toEqual([
      { gain: DEFAULT_GAIN, solo: true },
      { gain: 0.4, solo: false },
    ]);
  });

  it("plays every part with the chosen sound, from where the playhead is", () => {
    player.seek(3);
    score.catchUp();
    player.setSound("choir");
    score.report(0); // alphaTab rewinds while it generates the MIDI again.
    score.catchUp();

    expect(score.program).toBe(SOUND_PROGRAMS.choir);
    expect(score.tick).toBe(BAR * 1.5);
    expect(player.getSnapshot()).toMatchObject({ sound: "choir", position: 3 });
  });

  it("lets go of alphaTab when destroyed", () => {
    player.destroy();

    expect(score.destroyed).toBe(true);
  });
});
