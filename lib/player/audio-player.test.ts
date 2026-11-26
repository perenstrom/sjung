import { beforeEach, describe, expect, it } from "vitest";

import { createAudioPlayer, type MediaElement } from "@/lib/player/audio-player";
import { clampTempo, type Player } from "@/lib/player/player";
import { manualFrames } from "@/lib/testing/player";

/**
 * Stands in for the browser's `<audio>` element, the boundary the audio
 * player drives: it plays nothing, and a test moves `currentTime` itself.
 */
class FakeAudio extends EventTarget implements MediaElement {
  currentTime = 0;
  duration = Number.NaN;
  paused = true;
  playbackRate = 1;
  defaultPlaybackRate = 1;
  preservesPitch = false;

  async play() {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }

  load(duration: number) {
    this.duration = duration;
    this.dispatchEvent(new Event("loadedmetadata"));
  }
}

let audio: FakeAudio;
let frames: ReturnType<typeof manualFrames>;
let player: Player;

beforeEach(() => {
  audio = new FakeAudio();
  frames = manualFrames();
  player = createAudioPlayer(audio, frames);
  audio.load(120);
});

describe("the audio player", () => {
  it("is ready, paused at the start, at normal tempo and with no parts once the file has loaded", () => {
    expect(player.getSnapshot()).toMatchObject({
      status: "ready",
      playing: false,
      position: 0,
      duration: 120,
      tempo: 100,
      passage: null,
      parts: [],
    });
  });

  it("plays, follows the playhead and pauses", async () => {
    player.play();
    await Promise.resolve();
    audio.currentTime = 7.5;
    frames.run();

    expect(player.getSnapshot()).toMatchObject({ playing: true, position: 7.5 });

    player.pause();
    expect(player.getSnapshot().playing).toBe(false);
  });

  it("seeks within the file", () => {
    player.seek(30);
    expect([audio.currentTime, player.getSnapshot().position]).toEqual([30, 30]);

    player.seek(500);
    expect(player.getSnapshot().position).toBe(120);

    player.seek(-5);
    expect(player.getSnapshot().position).toBe(0);
  });

  it("plays at the kept tempo without changing the pitch", () => {
    player.setTempo(200);

    expect(player.getSnapshot().tempo).toBe(clampTempo(200));
    expect(audio.playbackRate).toBe(clampTempo(200) / 100);
    expect(audio.preservesPitch).toBe(true);
  });

  it("jumps back to the start of the passage when playback reaches its end", async () => {
    player.setPassage({ start: 10, end: 20 });
    player.play();
    await Promise.resolve();

    audio.currentTime = 20.05;
    frames.run();

    expect([audio.currentTime, player.getSnapshot().position]).toEqual([10, 10]);
  });

  it("starts a whole passage from its beginning when Play is pressed outside it", async () => {
    player.setPassage({ start: 10, end: 20 });
    player.seek(30);
    player.play();
    await Promise.resolve();

    expect(audio.currentTime).toBe(10);
  });

  it("repeats a passage that ends at the end of the file", async () => {
    player.setPassage({ start: 100, end: 120 });
    player.play();
    await Promise.resolve();

    audio.currentTime = 120;
    audio.pause();
    audio.dispatchEvent(new Event("ended"));
    await Promise.resolve();

    expect(player.getSnapshot()).toMatchObject({ playing: true, position: 100 });
  });

  it("keeps repeating while no frames run, as with the screen locked", async () => {
    player.setPassage({ start: 10, end: 20 });
    player.play();
    await Promise.resolve();

    audio.currentTime = 20.2;
    audio.dispatchEvent(new Event("timeupdate"));

    expect(player.getSnapshot().position).toBe(10);
  });

  it("tells subscribers when something changes, until they unsubscribe", () => {
    let calls = 0;
    const unsubscribe = player.subscribe(() => {
      calls += 1;
    });

    player.setTempo(90);
    unsubscribe();
    player.setTempo(80);

    expect(calls).toBe(1);
  });
});
