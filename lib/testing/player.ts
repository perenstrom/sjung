import { EQUAL_MIX } from "@/lib/player/mix";
import type { PlayerPart } from "@/lib/player/player";

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
