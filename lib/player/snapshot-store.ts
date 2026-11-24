import { IDLE_SNAPSHOT, type PlayerSnapshot } from "@/lib/player/player";

/**
 * A player's snapshot and its subscribers, for an engine to keep. A change
 * that changes nothing keeps the same snapshot and tells no one.
 */
export function createSnapshotStore(initial: PlayerSnapshot = IDLE_SNAPSHOT) {
  let snapshot = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => snapshot,
    update(change: Partial<PlayerSnapshot>) {
      const changed = (Object.keys(change) as (keyof PlayerSnapshot)[]).some((key) => change[key] !== snapshot[key]);
      if (!changed) return;
      snapshot = { ...snapshot, ...change };
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear: () => listeners.clear(),
  };
}
