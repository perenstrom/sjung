import { type PlayerCommand, type PlayerControlsView, TEMPO_STEP } from "@/lib/player/player-controls";

/** The parts of a `KeyboardEvent` a shortcut depends on. */
export type KeyPress = Pick<KeyboardEvent, "key" | "shiftKey" | "metaKey" | "ctrlKey" | "altKey">;

export type ShortcutContext = {
  view: Pick<PlayerControlsView, "passage" | "parts">;
  /** A popover or dialog is open, and handles Esc and the arrows itself. */
  layerOpen: boolean;
  /** A slider has focus, so the arrows and Home move it instead. */
  sliderFocused: boolean;
};

/** What a key asks of the player's controls, or `help` for the list of shortcuts, which the view keeps. */
export type KeyCommand = PlayerCommand | { type: "help" };

/**
 * The keys listed under "?", for a file with or without bars and parts. K, I and O also
 * work, like Space, A and B, for people used to editing software, but
 * nothing in the player mentions them.
 */
export function listedShortcuts({
  hasBars,
  hasParts,
}: {
  hasBars: boolean;
  hasParts: boolean;
}): readonly { keys: readonly string[]; what: string }[] {
  return [
    { keys: ["Mellanslag"], what: "Spela / pausa" },
    { keys: ["←", "→"], what: hasBars ? "En takt bakåt / framåt" : "5 sekunder bakåt / framåt" },
    { keys: ["Shift", "←/→"], what: hasBars ? "Fyra takter bakåt / framåt" : "20 sekunder bakåt / framåt" },
    { keys: ["Home"], what: "Till början (eller till repetitionens start)" },
    { keys: ["A"], what: hasBars ? "Repetera från den här takten" : "Repetera härifrån" },
    { keys: ["B"], what: hasBars ? "Repetera till och med den här takten" : "Repetera hit" },
    { keys: ["Esc"], what: "Sluta repetera" },
    { keys: ["−", "+"], what: `Tempo ${TEMPO_STEP} % långsammare / snabbare` },
    ...(hasParts
      ? [
          { keys: ["1–9"], what: "Solo på stämma 1–9 (igen för att släppa)" },
          { keys: ["0"], what: "Alla stämmor lika" },
        ]
      : []),
    { keys: ["?"], what: "Visa kortkommandon" },
  ];
}

/**
 * What a key asks of the player on desktop, or `null` when the player leaves
 * it to the page. Esc never closes the player: it only stops repeating, and
 * an open popover closes on it by itself.
 */
export function commandFor(press: KeyPress, { view, layerOpen, sliderFocused }: ShortcutContext): KeyCommand | null {
  if (press.metaKey || press.ctrlKey || press.altKey) return null;
  const navigating = !layerOpen && !sliderFocused;

  switch (press.key) {
    case " ":
    case "k":
    case "K":
      return { type: "togglePlay" };
    case "ArrowLeft":
    case "ArrowRight":
      if (!navigating) return null;
      return { type: "stepBars", by: (press.key === "ArrowLeft" ? -1 : 1) * (press.shiftKey ? 4 : 1) };
    case "Home":
      return navigating ? { type: "rewind" } : null;
    case "a":
    case "A":
    case "i":
    case "I":
      return { type: "markStart" };
    case "b":
    case "B":
    case "o":
    case "O":
      return { type: "markEnd" };
    case "Escape":
      return layerOpen || view.passage.range === null ? null : { type: "stopRepeating" };
    case "-":
    case "_":
      return { type: "stepTempo", by: -1 };
    case "+":
    case "=":
      return { type: "stepTempo", by: 1 };
    case "?":
      return { type: "help" };
    case "0":
      return view.parts.shown ? { type: "applyPreset", preset: "equal" } : null;
    default: {
      // 1–9: solo on that part, or off again.
      if (!/^[1-9]$/.test(press.key) || Number(press.key) > view.parts.list.length) return null;
      return { type: "toggleSolo", partNumber: Number(press.key) };
    }
  }
}
