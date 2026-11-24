import { browserFrames, type FrameScheduler } from "@/lib/player/frames";
import { clampTempo, isRepeating, type Loop, type Player } from "@/lib/player/player";
import { createSnapshotStore } from "@/lib/player/snapshot-store";

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
  const store = createSnapshotStore();
  const { update } = store;
  let frame: number | null = null;

  function durationOf(): number {
    return Number.isFinite(media.duration) ? media.duration : 0;
  }

  /** Jumps back to the passage's start once playback has reached its end. */
  function followPlayhead() {
    const { loop } = store.get();
    if (isRepeating(loop) && !media.paused && media.currentTime >= loop.end) {
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
      const { loop } = store.get();
      if (isRepeating(loop)) {
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
    getSnapshot: store.get,
    subscribe: store.subscribe,
    play() {
      const { loop } = store.get();
      // Pressing play outside a whole passage starts at its beginning.
      if (isRepeating(loop) && (media.currentTime < loop.start || media.currentTime >= loop.end)) {
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
      store.clear();
    },
  };
}
