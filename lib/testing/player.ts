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
