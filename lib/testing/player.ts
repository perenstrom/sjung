import { EQUAL_MIX } from "@/lib/player/mix";
import { clampTempo, IDLE_SNAPSHOT, type Player, type PlayerPart, type PlayerSnapshot } from "@/lib/player/player";
import { createSnapshotStore } from "@/lib/player/snapshot-store";

/** Animation frames that run only when the test says so. */
export function manualFrames() {
  let pending: (() => void) | null = null;
  return {
    requestFrame: (callback: () => void) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = null;
    },
    run() {
      const callback = pending;
      pending = null;
      callback?.();
    },
  };
}

/** A voice part named `name` (its id too), equal in the mix unless `change` says otherwise. */
export function part(name: string, change: Partial<PlayerPart> = {}): PlayerPart {
  return { id: name, name, percussion: false, ...EQUAL_MIX, ...change };
}

/**
 * A `Player` with no engine behind it: each command changes the snapshot at
 * once, as an engine reports it. It stands in for an engine at the player
 * interface, for tests of what talks to a player.
 */
export function fakePlayer(snapshot: Partial<PlayerSnapshot> = {}): Player {
  const store = createSnapshotStore({ ...IDLE_SNAPSHOT, status: "ready", ...snapshot });
  const { update } = store;
  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    play: () => update({ playing: true }),
    pause: () => update({ playing: false }),
    seek: (seconds) => update({ position: Math.min(store.get().duration, Math.max(0, seconds)) }),
    setTempo: (percent) => update({ tempo: clampTempo(percent) }),
    setPassage: (passage) => update({ passage }),
    setPart: (partId, change) =>
      update({ parts: store.get().parts.map((part) => (part.id === partId ? { ...part, ...change } : part)) }),
    setSound: (sound) => update({ sound }),
    destroy: store.clear,
  };
}
