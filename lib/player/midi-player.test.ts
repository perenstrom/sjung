import { beforeEach, describe, expect, it } from "vitest";

import { createMidiPlayer, type MidiSequencer } from "@/lib/player/midi-player";
import type { Player } from "@/lib/player/player";
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

let sequencer: FakeSequencer;
let frames: ReturnType<typeof manualFrames>;
let timer: ReturnType<typeof manualTimer>;
let player: Player;

beforeEach(() => {
  sequencer = new FakeSequencer();
  frames = manualFrames();
  timer = manualTimer();
  player = createMidiPlayer(sequencer, { bars: BARS, frames, timer });
});

describe("the MIDI player", () => {
  it("is ready, paused at the start, at normal tempo, with the file's bars and played on piano", () => {
    expect(player.getSnapshot()).toMatchObject({
      status: "ready",
      playing: false,
      position: 0,
      duration: 120,
      tempo: 100,
      loop: null,
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

  it.each([
    [75, 75],
    [200, 120],
    [10, 50],
  ])("changes the tempo to %s %% (kept to %s %%)", (asked, tempo) => {
    player.setTempo(asked);

    expect(player.getSnapshot().tempo).toBe(tempo);
    expect(sequencer.playbackRate).toBe(tempo / 100);
  });

  it("jumps back to the start of the passage when playback reaches its end, until repeating stops", () => {
    player.setLoop({ start: 10, end: 20 });
    player.play();

    sequencer.currentTime = 20.05;
    frames.run();
    expect([sequencer.currentTime, player.getSnapshot().position]).toEqual([10, 10]);

    player.setLoop(null);
    sequencer.currentTime = 20.05;
    frames.run();
    expect(player.getSnapshot().position).toBe(20.05);
  });

  it("keeps repeating while no frames run, as with the screen locked", () => {
    player.setLoop({ start: 10, end: 20 });
    player.play();

    sequencer.currentTime = 20.2;
    timer.run();

    expect(sequencer.currentTime).toBe(10);
  });

  it("starts a whole passage from its beginning when Play is pressed outside it", () => {
    player.setLoop({ start: 10, end: 20 });
    player.seek(30);
    player.play();

    expect(player.getSnapshot().position).toBe(10);
  });

  it("repeats a passage that ends at the end of the file", () => {
    player.setLoop({ start: 100, end: 120 });
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

  it("lets go of the synthesizer when destroyed", () => {
    player.play();
    player.destroy();

    expect(sequencer).toMatchObject({ paused: true, destroyed: true });
  });
});
