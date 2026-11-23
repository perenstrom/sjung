import {
  clampTempo,
  IDLE_SNAPSHOT,
  type Loop,
  type Player,
  type PlayerSnapshot,
} from "@/lib/player/player";

/** The parts of an `<audio>` element the audio player uses. */
export type MediaElement = Pick<
  HTMLMediaElement,
  | "currentTime"
  | "duration"
  | "paused"
  | "playbackRate"
  | "defaultPlaybackRate"
  | "preservesPitch"
  | "play"
  | "pause"
  | "addEventListener"
  | "removeEventListener"
>;

/** How the player follows the playhead while playing; animation frames in a browser. */
export type FrameScheduler = {
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
};

const browserFrames: FrameScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

/**
 * The audio engine: one plain `<audio>` element, with
 * `preservesPitch` so the tempo never changes the pitch. No decoding and no
 * Web Audio. An audio file has no parts and no choice of sound.
 *
 * While playing it reads the playhead every frame, since `timeupdate` fires
 * only a few times a second, so a repeat jumps back close to where its
 * passage ends. `timeupdate` enforces the repeat too, for when the browser
 * stops running frames, as with the screen locked.
 */
export function createAudioPlayer(media: MediaElement, frames: FrameScheduler = browserFrames): Player {
  let snapshot: PlayerSnapshot = IDLE_SNAPSHOT;
  const listeners = new Set<() => void>();
  let frame: number | null = null;

  function update(change: Partial<PlayerSnapshot>) {
    const changed = (Object.keys(change) as (keyof PlayerSnapshot)[]).some((key) => change[key] !== snapshot[key]);
    if (!changed) return;
    snapshot = { ...snapshot, ...change };
    for (const listener of listeners) listener();
  }

  function durationOf(): number {
    return Number.isFinite(media.duration) ? media.duration : 0;
  }

  /** Jumps back to the passage's start once playback has reached its end. */
  function followPlayhead() {
    const { loop } = snapshot;
    if (loop?.end != null && !media.paused && media.currentTime >= loop.end) {
      media.currentTime = loop.start;
    }
    update({ position: media.currentTime });
  }

  function tick() {
    frame = null;
    followPlayhead();
    if (!media.paused) frame = frames.requestFrame(tick);
  }

  function stopFollowing() {
    if (frame !== null) frames.cancelFrame(frame);
    frame = null;
  }

  const events: Record<string, () => void> = {
    loadedmetadata: () => update({ status: "ready", duration: durationOf() }),
    durationchange: () => update({ duration: durationOf() }),
    play: () => {
      update({ playing: true });
      if (frame === null) frame = frames.requestFrame(tick);
    },
    pause: () => {
      stopFollowing();
      update({ playing: false, position: media.currentTime });
    },
    ended: () => {
      const { loop } = snapshot;
      if (loop?.end != null) {
        // A passage that ends with the file: the element has stopped, so start it again.
        media.currentTime = loop.start;
        update({ position: media.currentTime });
        media.play().catch(() => update({ playing: false }));
        return;
      }
      stopFollowing();
      update({ playing: false, position: media.currentTime });
    },
    seeked: () => update({ position: media.currentTime }),
    timeupdate: followPlayhead,
    error: () => update({ status: "error", playing: false }),
  };
  for (const [type, handler] of Object.entries(events)) media.addEventListener(type, handler);

  media.preservesPitch = true;
  if (Number.isFinite(media.duration)) events.loadedmetadata();

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play() {
      const { loop } = snapshot;
      // Pressing play outside a whole passage starts at its beginning.
      if (loop?.end != null && (media.currentTime < loop.start || media.currentTime >= loop.end)) {
        media.currentTime = loop.start;
      }
      media.play().catch(() => update({ playing: false }));
    },
    pause: () => media.pause(),
    seek(seconds) {
      media.currentTime = Math.min(durationOf(), Math.max(0, seconds));
      update({ position: media.currentTime });
    },
    setTempo(percent) {
      const tempo = clampTempo(percent);
      // The default rate too, since loading the file again resets to it.
      media.defaultPlaybackRate = tempo / 100;
      media.playbackRate = tempo / 100;
      media.preservesPitch = true;
      update({ tempo });
    },
    setLoop(loop: Loop | null) {
      update({ loop });
    },
    setPart() {},
    setSound() {},
    destroy() {
      stopFollowing();
      for (const [type, handler] of Object.entries(events)) media.removeEventListener(type, handler);
      media.pause();
      listeners.clear();
    },
  };
}
