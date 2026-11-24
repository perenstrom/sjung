import { browserFrames, browserTimer, type FrameScheduler, type Timer } from "@/lib/player/frames";
import type { MidiPart } from "@/lib/player/midi-parts";
import { audibleGain, DEFAULT_GAIN } from "@/lib/player/mix";
import {
  clampTempo,
  IDLE_SNAPSHOT,
  isRepeating,
  type Loop,
  type Player,
  type PlayerPart,
  playStart,
  repeatJump,
} from "@/lib/player/player";
import { createSnapshotStore } from "@/lib/player/snapshot-store";
import { SOUND_PROGRAMS } from "@/lib/player/soundfont";

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
  /** Sets a synthesizer channel's gain over the file's own volume: 1 as written, 0 silent. */
  setChannelGain(channel: number, gain: number): void;
  /** Plays every channel but percussion with this General MIDI program, whatever the file asks for. */
  setProgram(program: number): void;
  /** Stops the synthesizer and lets go of its audio. */
  destroy(): void;
};

/** How often the timer enforces a repeat while frames don't run. */
const REPEAT_CHECK_MILLISECONDS = 250;

/**
 * The MIDI engine (ADR-0010): SpessaSynth's sequencer, for a loaded file
 * with these `bars` and `parts`. A sequencer changes tempo without changing
 * pitch by itself. A part is mixed through the gain of the channels it plays
 * on; a channel two parts share is heard as loud as the louder of them.
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
    parts: midiParts,
    frames = browserFrames,
    timer = browserTimer,
  }: { bars: readonly number[]; parts: readonly MidiPart[]; frames?: FrameScheduler; timer?: Timer },
): Player {
  const parts: PlayerPart[] = midiParts.map(({ id, name, percussion }) => ({
    id,
    name,
    percussion,
    gain: DEFAULT_GAIN,
    muted: false,
    solo: false,
  }));
  const store = createSnapshotStore({ ...IDLE_SNAPSHOT, status: "ready", duration: sequencer.duration, bars, parts });
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

  /** Sets each channel to the loudest part heard on it, the default volume being the file's own. */
  function mixChannels(mixed: readonly PlayerPart[]) {
    const gains = new Map<number, number>();
    midiParts.forEach(({ channels }, index) => {
      const gain = audibleGain(mixed[index], mixed) / DEFAULT_GAIN;
      for (const channel of channels) gains.set(channel, Math.max(gains.get(channel) ?? 0, gain));
    });
    for (const [channel, gain] of gains) sequencer.setChannelGain(channel, gain);
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
    setPart(partId, change) {
      const mixed = store.get().parts.map((part) => (part.id === partId ? { ...part, ...change } : part));
      mixChannels(mixed);
      update({ parts: mixed });
    },
    setSound(sound) {
      sequencer.setProgram(SOUND_PROGRAMS[sound]);
      update({ sound });
    },
    destroy() {
      stopFollowing();
      sequencer.pause();
      sequencer.destroy();
      store.clear();
    },
  };
}
