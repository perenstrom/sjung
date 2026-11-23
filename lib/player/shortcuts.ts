import { clampTempo, formatTime, type Loop, type Player, type PlayerSnapshot } from "@/lib/player/player";

/** The parts of a `KeyboardEvent` a shortcut depends on. */
export type KeyPress = Pick<KeyboardEvent, "key" | "shiftKey" | "metaKey" | "ctrlKey" | "altKey">;

export type ShortcutContext = {
  snapshot: PlayerSnapshot;
  /** A popover or dialog is open, and handles Esc and the arrows itself. */
  layerOpen: boolean;
  /** A slider has focus, so the arrows and Home move it instead. */
  onRange: boolean;
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
const AUDIO_STEP_SECONDS = 5;
const TEMPO_STEP = 5;

/**
 * The keys listed under "?". K, I and O also work, like Space, A and B, for
 * people used to editing software, but nothing in the player mentions them.
 */
export const LISTED_SHORTCUTS: readonly { keys: readonly string[]; what: string }[] = [
  { keys: ["Mellanslag"], what: "Spela / pausa" },
  { keys: ["←", "→"], what: "5 sekunder bakåt / framåt" },
  { keys: ["Shift", "←/→"], what: "20 sekunder bakåt / framåt" },
  { keys: ["Home"], what: "Till början (eller till repetitionens start)" },
  { keys: ["A"], what: "Repetera härifrån" },
  { keys: ["B"], what: "Repetera hit" },
  { keys: ["Esc"], what: "Sluta repetera" },
  { keys: ["−", "+"], what: "Tempo 5 % långsammare / snabbare" },
  { keys: ["?"], what: "Visa kortkommandon" },
];

/**
 * What a key does in the player on desktop, or `null` when the player leaves
 * it to the page. Esc never closes the player: it only stops repeating, and
 * an open popover closes on it by itself.
 */
export function shortcutFor(press: KeyPress, { snapshot, layerOpen, onRange }: ShortcutContext): Shortcut | null {
  if (press.metaKey || press.ctrlKey || press.altKey) return null;
  const { position, duration, loop, playing, tempo } = snapshot;
  const navigating = !layerOpen && !onRange;

  switch (press.key) {
    case " ":
    case "k":
    case "K":
      return playing ? { action: { type: "pause" }, hud: "Paus" } : { action: { type: "play" }, hud: "Spelar" };
    case "ArrowLeft":
    case "ArrowRight": {
      if (!navigating) return null;
      const step = (press.key === "ArrowLeft" ? -1 : 1) * (press.shiftKey ? 4 : 1) * AUDIO_STEP_SECONDS;
      return {
        action: { type: "seek", seconds: Math.min(duration, Math.max(0, position + step)) },
        hud: `${step > 0 ? "+" : "−"}${Math.abs(step)} s`,
      };
    }
    case "Home":
      if (!navigating) return null;
      return loop?.end != null
        ? { action: { type: "seek", seconds: loop.start }, hud: "Till repetitionens start" }
        : { action: { type: "seek", seconds: 0 }, hud: "Till början" };
    case "a":
    case "A":
    case "i":
    case "I":
      return repeatShortcut(markStart(loop, position));
    case "b":
    case "B":
    case "o":
    case "O": {
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

/** A: the passage starts here, keeping its end if that is still after it. */
function markStart(loop: Loop | null, position: number): Loop {
  return { start: position, end: loop?.end != null && loop.end > position ? loop.end : null };
}

/**
 * B: the passage ends here, from its start or the start of the file. An end
 * before the start swaps them; `null` for an end at the start.
 */
function markEnd(loop: Loop | null, position: number): Loop | null {
  const start = loop?.start ?? 0;
  if (position === start) return null;
  return position > start ? { start, end: position } : { start: position, end: start };
}
