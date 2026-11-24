/** How a player follows the playhead while playing; animation frames in a browser. */
export type FrameScheduler = {
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
};

export const browserFrames: FrameScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

/**
 * A repeating timer, which keeps running when animation frames stop, as with
 * the screen locked; `every` returns how to stop it.
 */
export type Timer = { every: (milliseconds: number, callback: () => void) => () => void };

export const browserTimer: Timer = {
  every(milliseconds, callback) {
    const handle = setInterval(callback, milliseconds);
    return () => clearInterval(handle);
  },
};
