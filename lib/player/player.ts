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
  setLoop(loop: Loop | null): void;
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
  loop: Loop | null;
  /** Empty for a file that has no parts to mix, such as audio. */
  parts: readonly PlayerPart[];
  sound: PlayerSound;
};

/**
 * A passage to repeat, in seconds. Playback loops it once it has an end;
 * with only a start, it is still being marked.
 */
export type Loop = { start: number; end: number | null };

/** Whether a passage is set and repeats: it has an end, not just a start being marked. */
export function isRepeating(loop: Loop | null): loop is Loop & { end: number } {
  return loop?.end != null;
}

export type PlayerPart = { id: string; name: string; gain: number; muted: boolean; solo: boolean };

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
  loop: null,
  parts: [],
  sound: "piano",
};

export function clampTempo(percent: number): number {
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(percent)));
}

/**
 * "Start här" / "Slut här" at the playhead: starts a passage, or ends the one
 * being marked. An end before the start swaps them; an end at the start keeps
 * marking.
 */
export function markLoop(loop: Loop | null, position: number): Loop {
  if (loop === null || loop.end !== null) return { start: position, end: null };
  if (position === loop.start) return loop;
  return position > loop.start ? { start: loop.start, end: position } : { start: position, end: loop.start };
}

/** Seconds as m:ss. */
export function formatTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
