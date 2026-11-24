import { browserFrames, browserTimer, type FrameScheduler, type Timer } from "@/lib/player/frames";
import {
  clampTempo,
  IDLE_SNAPSHOT,
  isRepeating,
  type Loop,
  type Player,
  playStart,
  repeatJump,
} from "@/lib/player/player";
import { createSnapshotStore } from "@/lib/player/snapshot-store";

/**
 * The parts of SpessaSynth's sequencer the MIDI player uses, with the file
 * already loaded. Times are in seconds of the file at its own tempo, whatever
 * `playbackRate` is.
 */
export type MidiSequencer = {
  currentTime: number;
  readonly paused: boolean;
  readonly duration: number;
  playbackRate: number;
  play(): void;
  pause(): void;
  /** Calls `callback` when playback reaches the end of the file and stops. */
  onEnded(callback: () => void): void;
  /** Stops the synthesizer and lets go of its audio. */
  destroy(): void;
};

/** How often the timer enforces a repeat while frames don't run. */
const REPEAT_CHECK_MILLISECONDS = 250;

/**
 * The MIDI engine (ADR-0010): SpessaSynth's sequencer, for a loaded file
 * with these `bars`. A sequencer changes tempo without changing pitch by
 * itself. The file is played on piano; mixing its parts comes with Stämmor.
 *
 * While playing it reads the playhead every frame, so a repeat jumps back
 * close to where its passage ends. A slower timer enforces the repeat too,
 * for when the browser stops running frames but the synthesizer plays on, as
 * with the screen locked.
 */
export function createMidiPlayer(
  sequencer: MidiSequencer,
  {
    bars,
    frames = browserFrames,
    timer = browserTimer,
  }: { bars: readonly number[]; frames?: FrameScheduler; timer?: Timer }
): Player {
  const store = createSnapshotStore({ ...IDLE_SNAPSHOT, status: "ready", duration: sequencer.duration, bars });
  const { update } = store;
  let frame: number | null = null;
  let stopTimer: (() => void) | null = null;

  function followPlayhead() {
    const jump = repeatJump(store.get().loop, sequencer.currentTime);
    if (jump !== null) sequencer.currentTime = jump;
    update({ position: sequencer.currentTime });
  }

  function tick() {
    frame = null;
    followPlayhead();
    if (!sequencer.paused) frame = frames.requestFrame(tick);
  }

  function stopFollowing() {
    if (frame !== null) frames.cancelFrame(frame);
    frame = null;
    stopTimer?.();
    stopTimer = null;
  }

  function play() {
    const start = playStart(store.get().loop, sequencer.currentTime);
    if (start !== null) sequencer.currentTime = start;
    sequencer.play();
    update({ playing: true, position: sequencer.currentTime });
    if (frame === null) frame = frames.requestFrame(tick);
    stopTimer ??= timer.every(REPEAT_CHECK_MILLISECONDS, followPlayhead);
  }

  sequencer.onEnded(() => {
    stopFollowing();
    // A passage that ends with the file: the sequencer has stopped, so start it again.
    if (isRepeating(store.get().loop)) {
      play();
      return;
    }
    update({ playing: false, position: sequencer.duration });
  });

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    play,
    pause() {
      sequencer.pause();
      stopFollowing();
      update({ playing: false, position: sequencer.currentTime });
    },
    seek(seconds) {
      sequencer.currentTime = Math.min(sequencer.duration, Math.max(0, seconds));
      update({ position: sequencer.currentTime });
    },
    setTempo(percent) {
      const tempo = clampTempo(percent);
      sequencer.playbackRate = tempo / 100;
      update({ tempo });
    },
    setLoop(loop: Loop | null) {
      update({ loop });
    },
    setPart() {},
    setSound() {},
    destroy() {
      stopFollowing();
      sequencer.pause();
      sequencer.destroy();
      store.clear();
    },
  };
}
