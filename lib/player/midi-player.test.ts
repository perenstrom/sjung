import { beforeEach, describe, expect, it } from "vitest";

import { type MidiPart } from "@/lib/player/midi-parts";
import { createMidiPlayer, type MidiSequencer } from "@/lib/player/midi-player";
import { DEFAULT_GAIN } from "@/lib/player/mix";
import { clampTempo, type Player } from "@/lib/player/player";
import { manualFrames } from "@/lib/testing/player";

/**
 * Stands in for SpessaSynth's sequencer, the boundary the MIDI player drives:
 * it plays nothing, and a test moves `currentTime` itself.
 */
class FakeSequencer implements MidiSequencer {
  currentTime = 0;
  paused = true;
  duration = 120;
  playbackRate = 1;
  destroyed = false;
  /** Each channel's gain, as last set; 1 until set. */
  channelGains = new Map<number, number>();
  program = 0;
  private ended: (() => void) | null = null;

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  onEnded(callback: () => void) {
    this.ended = callback;
  }

  destroy() {
    this.destroyed = true;
  }

  setChannelGain(channel: number, gain: number) {
    this.channelGains.set(channel, gain);
  }

  setProgram(program: number) {
    this.program = program;
  }

  gainOf(channel: number) {
    return this.channelGains.get(channel) ?? 1;
  }

  /** Plays to the end of the song, where the sequencer stops by itself. */
  end() {
    this.currentTime = this.duration;
    this.paused = true;
    this.ended?.();
  }
}

/** A repeating timer that runs only when the test says so. */
function manualTimer() {
  let pending: (() => void) | null = null;
  return {
    every: (_milliseconds: number, callback: () => void) => {
      pending = callback;
      return () => {
        pending = null;
      };
    },
    run: () => pending?.(),
  };
}

const BARS = [0, 2, 4, 6];

const PARTS: MidiPart[] = [
  { id: "track-1", name: "Sopran", percussion: false, channels: [0] },
  { id: "track-2", name: "Alt", percussion: false, channels: [1] },
  // Shares a channel with the alto, as tracks sometimes do.
  { id: "track-3", name: "Alt 2", percussion: false, channels: [1] },
  { id: "track-4", name: "Trummor", percussion: true, channels: [9] },
];

let sequencer: FakeSequencer;
let frames: ReturnType<typeof manualFrames>;
let timer: ReturnType<typeof manualTimer>;
let player: Player;

beforeEach(() => {
  sequencer = new FakeSequencer();
  frames = manualFrames();
  timer = manualTimer();
  player = createMidiPlayer(sequencer, { bars: BARS, parts: PARTS, frames, timer });
});

describe("the MIDI player", () => {
  it("is ready, paused at the start, at normal tempo, with the file's bars and played on piano", () => {
    expect(player.getSnapshot()).toMatchObject({
      status: "ready",
      playing: false,
      position: 0,
      duration: 120,
      tempo: 100,
      passage: null,
      bars: BARS,
      sound: "piano",
    });
  });

  it("plays, follows the playhead and pauses", () => {
    player.play();
    sequencer.currentTime = 7.5;
    frames.run();

    expect(player.getSnapshot()).toMatchObject({ playing: true, position: 7.5 });
    expect(sequencer.paused).toBe(false);

    player.pause();
    expect(player.getSnapshot().playing).toBe(false);
    expect(sequencer.paused).toBe(true);
  });

  it("seeks within the file", () => {
    player.seek(30);
    expect([sequencer.currentTime, player.getSnapshot().position]).toEqual([30, 30]);

    player.seek(500);
    expect(player.getSnapshot().position).toBe(120);

    player.seek(-5);
    expect(player.getSnapshot().position).toBe(0);
  });

  it("plays at the kept tempo", () => {
    player.setTempo(200);

    expect(player.getSnapshot().tempo).toBe(clampTempo(200));
    expect(sequencer.playbackRate).toBe(clampTempo(200) / 100);
  });

  it("jumps back to the start of the passage when playback reaches its end", () => {
    player.setPassage({ start: 10, end: 20 });
    player.play();

    sequencer.currentTime = 20.05;
    frames.run();

    expect([sequencer.currentTime, player.getSnapshot().position]).toEqual([10, 10]);
  });

  it("keeps repeating while no frames run, as with the screen locked", () => {
    player.setPassage({ start: 10, end: 20 });
    player.play();

    sequencer.currentTime = 20.2;
    timer.run();

    expect(sequencer.currentTime).toBe(10);
  });

  it("starts a whole passage from its beginning when Play is pressed outside it", () => {
    player.setPassage({ start: 10, end: 20 });
    player.seek(30);
    player.play();

    expect(player.getSnapshot().position).toBe(10);
  });

  it("repeats a passage that ends at the end of the file", () => {
    player.setPassage({ start: 100, end: 120 });
    player.play();

    sequencer.end();

    expect(player.getSnapshot()).toMatchObject({ playing: true, position: 100 });
    expect(sequencer.paused).toBe(false);
  });

  it("stops at the end of the file", () => {
    player.play();

    sequencer.end();

    expect(player.getSnapshot()).toMatchObject({ playing: false, position: 120 });
  });

  it("lists the file's parts, all equal", () => {
    expect(player.getSnapshot().parts).toEqual(
      PARTS.map(({ id, name, percussion }) => ({
        id,
        name,
        percussion,
        gain: DEFAULT_GAIN,
        muted: false,
        solo: false,
      })),
    );
  });

  it("plays each part's channels at the volume it is heard at, the default volume being the file's own", () => {
    player.setPart("track-1", { gain: DEFAULT_GAIN / 2, solo: true });
    player.setPart("track-4", { solo: true });

    expect(player.getSnapshot().parts[0].gain).toBe(DEFAULT_GAIN / 2);
    // The soloed soprano at half volume, the alto silenced by the solos, the soloed drums at full.
    expect([0, 1, 9].map((channel) => sequencer.gainOf(channel))).toEqual([0.5, 0, 1]);
  });

  it("keeps a channel heard while any part on it is", () => {
    player.setPart("track-2", { muted: true });

    expect(sequencer.gainOf(1)).toBe(1);
  });

  it("switches between piano and choir", () => {
    player.setSound("choir");
    expect([player.getSnapshot().sound, sequencer.program]).toEqual(["choir", 52]);

    player.setSound("piano");
    expect([player.getSnapshot().sound, sequencer.program]).toEqual(["piano", 0]);
  });

  it("lets go of the synthesizer when destroyed", () => {
    player.play();
    player.destroy();

    expect(sequencer).toMatchObject({ paused: true, destroyed: true });
  });
});
