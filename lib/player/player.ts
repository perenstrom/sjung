/**
 * The player interface (ADR-0010): the one thing the player view talks to,
 * whatever engine plays the File. An engine-specific feature has to fit here
 * or stay out. Nothing is remembered between visits: a new player starts
 * from the defaults.
 */
export interface Player {
  /** What the player is doing now. The same object until something changes. */
  getSnapshot(): PlayerSnapshot;
  /** Calls `listener` whenever the snapshot changes; returns how to stop. */
  subscribe(listener: () => void): () => void;
  play(): void;
  pause(): void;
  /** Moves the playhead to `seconds`, kept within the file. */
  seek(seconds: number): void;
  /** Sets the tempo in percent, kept within `TEMPO_MIN`–`TEMPO_MAX`. Pitch never changes. */
  setTempo(percent: number): void;
  /** Sets the passage to repeat, or `null` to stop repeating. */
  setPassage(passage: Passage | null): void;
  /** Changes one part's gain, mute or solo. */
  setPart(partId: string, change: Partial<Pick<PlayerPart, "gain" | "muted" | "solo">>): void;
  setSound(sound: PlayerSound): void;
  /** Stops playing and lets go of the engine. */
  destroy(): void;
}

export type PlayerSnapshot = {
  status: "loading" | "ready" | "error";
  playing: boolean;
  /** The playhead, in seconds. */
  position: number;
  /** In seconds; 0 until the file has loaded. */
  duration: number;
  /** In percent of the file's own tempo. */
  tempo: number;
  passage: Passage | null;
  /**
   * When each bar starts, in seconds, in order. Empty for a file without
   * bars, such as audio.
   */
  bars: readonly number[];
  /**
   * The number the score gives each of `bars`, where it differs from the
   * count in playing order, as it does when a repeat plays bars again. Empty
   * when they are the same.
   */
  barNumbers: readonly number[];
  /** Empty for a file that has no parts to mix, such as audio. */
  parts: readonly PlayerPart[];
  sound: PlayerSound;
};

/**
 * A passage to repeat, in seconds. Playback loops it once it has an end;
 * with only a start, it is still being marked.
 */
export type Passage = { start: number; end: number | null };

/** Whether a passage is set and repeats: it has an end, not just a start being marked. */
export function isRepeating(passage: Passage | null): passage is Passage & { end: number } {
  return passage?.end != null;
}

/**
 * One part to mix: a voice, or percussion. `gain` is its volume from 0 to 1;
 * a muted part is silent, and while any part is soloed only soloed parts are
 * heard (`audibleGain`).
 */
export type PlayerPart = {
  id: string;
  name: string;
  /** Drums and the like, marked *slagverk*, and never anyone's own part. */
  percussion: boolean;
  gain: number;
  muted: boolean;
  solo: boolean;
};

/**
 * A part's name: as the file gives it, or "Stämma n" after its `place`
 * among the parts (counted from 0) when the file gives none.
 */
export function partName(fromFile: string, place: number): string {
  return fromFile.trim() || `Stämma ${place + 1}`;
}

/** The instrument a notation or MIDI file is played with. */
export type PlayerSound = "piano" | "choir";

export const TEMPO_MIN = 50;
export const TEMPO_MAX = 120;
export const DEFAULT_TEMPO = 100;

/** The snapshot of a player that has not loaded anything yet. */
export const IDLE_SNAPSHOT: PlayerSnapshot = {
  status: "loading",
  playing: false,
  position: 0,
  duration: 0,
  tempo: DEFAULT_TEMPO,
  passage: null,
  bars: [],
  barNumbers: [],
  parts: [],
  sound: "piano",
};

export function clampTempo(percent: number): number {
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(percent)));
}

/** Where playback jumps back to once it reaches the end of a repeating passage; `null` while it plays on. */
export function repeatJump(passage: Passage | null, position: number): number | null {
  return isRepeating(passage) && position >= passage.end ? passage.start : null;
}

/** Where Play starts outside a repeating passage: at its beginning; `null` to play from the playhead. */
export function playStart(passage: Passage | null, position: number): number | null {
  return isRepeating(passage) && (position < passage.start || position >= passage.end) ? passage.start : null;
}

/** The bar `seconds` falls in, counted from 1; `null` for a file without bars. */
export function barAt(bars: readonly number[], seconds: number): number | null {
  if (bars.length === 0) return null;
  const next = bars.findIndex((start) => start > seconds);
  return next === -1 ? bars.length : Math.max(1, next);
}

/** The number the score gives `bar`, counted from 1 in playing order (see `PlayerSnapshot.barNumbers`). */
export function barNumber(barNumbers: readonly number[], bar: number): number {
  return barNumbers[bar - 1] ?? bar;
}

/** The number the score gives the bar `seconds` falls in; `null` for a file without bars. */
export function barNumberAt(bars: readonly number[], barNumbers: readonly number[], seconds: number): number | null {
  const bar = barAt(bars, seconds);
  return bar === null ? null : barNumber(barNumbers, bar);
}

/**
 * The bars a repeating passage runs over, as the score numbers them: "16–19",
 * or "16" for one bar. It ends in the bar before the one starting where it ends.
 */
export function passageBarsLabel(
  passage: { start: number; end: number },
  bars: readonly number[],
  barNumbers: readonly number[],
): string {
  const first = barAt(bars, passage.start) ?? 1;
  const last = barAt(bars, bars.findLast((start) => start < passage.end) ?? passage.end) ?? first;
  return first === last
    ? `${barNumber(barNumbers, first)}`
    : `${barNumber(barNumbers, first)}–${barNumber(barNumbers, last)}`;
}

/** Seconds as m:ss. */
export function formatTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
