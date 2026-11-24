import {
  barAt,
  clampTempo,
  formatTime,
  isRepeating,
  type Loop,
  markLoop,
  type Player,
  type PlayerSnapshot,
} from "@/lib/player/player";

/** The parts of a `KeyboardEvent` a shortcut depends on. */
export type KeyPress = Pick<KeyboardEvent, "key" | "shiftKey" | "metaKey" | "ctrlKey" | "altKey">;

export type ShortcutContext = {
  snapshot: PlayerSnapshot;
  /** A popover or dialog is open, and handles Esc and the arrows itself. */
  layerOpen: boolean;
  /** A slider has focus, so the arrows and Home move it instead. */
  sliderFocused: boolean;
};

export type ShortcutAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "seek"; seconds: number }
  | { type: "loop"; loop: Loop | null }
  | { type: "tempo"; percent: number }
  | { type: "help" };

/** What a key does, and the short message (HUD) saying so; `action` is `null` when the key changes nothing. */
export type Shortcut = { action: ShortcutAction | null; hud: string | null };

/** How far ← / → move in a file without bars, in seconds; Shift moves four times as far. */
const STEP_SECONDS_WITHOUT_BARS = 5;
const TEMPO_STEP = 5;

/**
 * The keys listed under "?", for a file with or without bars. K, I and O also
 * work, like Space, A and B, for people used to editing software, but
 * nothing in the player mentions them.
 */
export function listedShortcuts({
  hasBars,
}: {
  hasBars: boolean;
}): readonly { keys: readonly string[]; what: string }[] {
  return [
    { keys: ["Mellanslag"], what: "Spela / pausa" },
    { keys: ["←", "→"], what: hasBars ? "En takt bakåt / framåt" : "5 sekunder bakåt / framåt" },
    { keys: ["Shift", "←/→"], what: hasBars ? "Fyra takter bakåt / framåt" : "20 sekunder bakåt / framåt" },
    { keys: ["Home"], what: "Till början (eller till repetitionens start)" },
    { keys: ["A"], what: hasBars ? "Repetera från den här takten" : "Repetera härifrån" },
    { keys: ["B"], what: hasBars ? "Repetera till och med den här takten" : "Repetera hit" },
    { keys: ["Esc"], what: "Sluta repetera" },
    { keys: ["−", "+"], what: "Tempo 5 % långsammare / snabbare" },
    { keys: ["?"], what: "Visa kortkommandon" },
  ];
}

/**
 * What a key does in the player on desktop, or `null` when the player leaves
 * it to the page. Esc never closes the player: it only stops repeating, and
 * an open popover closes on it by itself.
 */
export function shortcutFor(press: KeyPress, { snapshot, layerOpen, sliderFocused }: ShortcutContext): Shortcut | null {
  if (press.metaKey || press.ctrlKey || press.altKey) return null;
  const { position, duration, loop, playing, tempo, bars } = snapshot;
  const hasBars = bars.length > 0;
  const bar = barAt(bars, position) ?? 1;
  const navigating = !layerOpen && !sliderFocused;

  switch (press.key) {
    case " ":
    case "k":
    case "K":
      return playing ? { action: { type: "pause" }, hud: "Paus" } : { action: { type: "play" }, hud: "Spelar" };
    case "ArrowLeft":
    case "ArrowRight": {
      if (!navigating) return null;
      const direction = (press.key === "ArrowLeft" ? -1 : 1) * (press.shiftKey ? 4 : 1);
      if (hasBars) {
        const target = Math.min(bars.length, Math.max(1, bar + direction));
        return { action: { type: "seek", seconds: barStart(bars, target) }, hud: `Takt ${target}` };
      }
      const step = direction * STEP_SECONDS_WITHOUT_BARS;
      return {
        action: { type: "seek", seconds: Math.min(duration, Math.max(0, position + step)) },
        hud: `${step > 0 ? "+" : "−"}${Math.abs(step)} s`,
      };
    }
    case "Home":
      if (!navigating) return null;
      return isRepeating(loop)
        ? { action: { type: "seek", seconds: loop.start }, hud: "Till repetitionens start" }
        : { action: { type: "seek", seconds: 0 }, hud: "Till början" };
    case "a":
    case "A":
    case "i":
    case "I":
      if (hasBars) return barRepeatShortcut(markStart(loop, barStart(bars, bar)), bars);
      return repeatShortcut(markStart(loop, position));
    case "b":
    case "B":
    case "o":
    case "O": {
      if (hasBars) return barRepeatShortcut(markEndBar(loop, bar, bars, duration), bars);
      const marked = markEnd(loop, position);
      return marked ? repeatShortcut(marked) : { action: null, hud: "Sätt slutet efter starten" };
    }
    case "Escape":
      if (layerOpen || loop === null) return null;
      return { action: { type: "loop", loop: null }, hud: "Repeterar inte längre" };
    case "-":
    case "_":
    case "+":
    case "=": {
      const percent = clampTempo(tempo + (press.key === "-" || press.key === "_" ? -TEMPO_STEP : TEMPO_STEP));
      return { action: { type: "tempo", percent }, hud: `Tempo ${percent} %` };
    }
    case "?":
      return { action: { type: "help" }, hud: null };
    default:
      return null;
  }
}

/** Does a shortcut's action to the player; "help" is the view's to handle. */
export function runShortcutAction(player: Player, action: Exclude<ShortcutAction, { type: "help" }>) {
  switch (action.type) {
    case "play":
      return player.play();
    case "pause":
      return player.pause();
    case "seek":
      return player.seek(action.seconds);
    case "loop":
      return player.setLoop(action.loop);
    case "tempo":
      return player.setTempo(action.percent);
  }
}

function repeatShortcut(loop: Loop): Shortcut {
  return {
    action: { type: "loop", loop },
    hud:
      loop.end === null
        ? "Repetera härifrån – tryck B vid slutet"
        : `Repeterar ${formatTime(loop.start)}–${formatTime(loop.end)}`,
  };
}

function barRepeatShortcut(loop: Loop, bars: readonly number[]): Shortcut {
  const start = barAt(bars, loop.start);
  const endSeconds = loop.end;
  if (endSeconds === null)
    return { action: { type: "loop", loop }, hud: `Repetera från takt ${start} – tryck B vid slutet` };
  // The bar the passage ends in, not the one starting where it ends.
  const end = barAt(bars, bars.findLast((barStart) => barStart < endSeconds) ?? endSeconds);
  return { action: { type: "loop", loop }, hud: `Repeterar takt ${start === end ? start : `${start}–${end}`}` };
}

/**
 * B in a file with bars: the passage runs over whole bars, from the bar it
 * starts in (or the first) to the end of the `current` bar, in whichever
 * order they come.
 */
function markEndBar(loop: Loop | null, current: number, bars: readonly number[], duration: number): Loop {
  const marked = barAt(bars, loop?.start ?? 0) ?? 1;
  const [first, last] = marked <= current ? [marked, current] : [current, marked];
  // The end of the last bar is where the next one starts, or the end of the file.
  return { start: barStart(bars, first), end: bars[last] ?? duration };
}

/** When bar `bar` (counted from 1) starts, in seconds. */
function barStart(bars: readonly number[], bar: number): number {
  return bars[bar - 1];
}

/** A: the passage starts here, keeping its end if that is still after it. */
function markStart(loop: Loop | null, position: number): Loop {
  return { start: position, end: isRepeating(loop) && loop.end > position ? loop.end : null };
}

/**
 * B: the passage ends here, from its start or the start of the file, as
 * "Slut här" does; `null` for an end at the start.
 */
function markEnd(loop: Loop | null, position: number): Loop | null {
  const marked = markLoop({ start: loop?.start ?? 0, end: null }, position);
  return isRepeating(marked) ? marked : null;
}
