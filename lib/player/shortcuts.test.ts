import { describe, expect, it } from "vitest";

import { IDLE_SNAPSHOT, type PlayerSnapshot } from "@/lib/player/player";
import { controlsView } from "@/lib/player/player-controls";
import { commandFor, type KeyPress, listedShortcuts, type ShortcutContext } from "@/lib/player/shortcuts";
import { part } from "@/lib/testing/player";

function context(snapshot: Partial<PlayerSnapshot> = {}, rest: Partial<Omit<ShortcutContext, "view">> = {}) {
  const view = controlsView({ ...IDLE_SNAPSHOT, ...snapshot }, { mine: null, scoreTakesTaps: false });
  return { view, layerOpen: false, sliderFocused: false, ...rest } satisfies ShortcutContext;
}

function press(key: string, modifiers: Partial<Omit<KeyPress, "key">> = {}): KeyPress {
  return { key, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...modifiers };
}

const passage = { passage: { start: 10, end: 50 } };
const parts = { parts: [part("Sopran"), part("Alt"), part("Tenor")] };

describe("commandFor", () => {
  it.each<{ key: string; shiftKey?: boolean; snapshot?: Partial<PlayerSnapshot>; command: unknown }>([
    { key: " ", command: { type: "togglePlay" } },
    { key: "k", command: { type: "togglePlay" } },
    { key: "K", command: { type: "togglePlay" } },
    { key: "ArrowLeft", command: { type: "stepBars", by: -1 } },
    { key: "ArrowRight", command: { type: "stepBars", by: 1 } },
    { key: "ArrowLeft", shiftKey: true, command: { type: "stepBars", by: -4 } },
    { key: "ArrowRight", shiftKey: true, command: { type: "stepBars", by: 4 } },
    { key: "Home", command: { type: "rewind" } },
    { key: "a", command: { type: "markStart" } },
    { key: "I", command: { type: "markStart" } },
    { key: "B", command: { type: "markEnd" } },
    { key: "o", command: { type: "markEnd" } },
    { key: "Escape", snapshot: passage, command: { type: "stopRepeating" } },
    { key: "-", command: { type: "stepTempo", by: -1 } },
    { key: "+", command: { type: "stepTempo", by: 1 } },
    { key: "=", command: { type: "stepTempo", by: 1 } },
    { key: "?", shiftKey: true, command: { type: "help" } },
    { key: "1", snapshot: parts, command: { type: "toggleSolo", partNumber: 1 } },
    { key: "3", snapshot: parts, command: { type: "toggleSolo", partNumber: 3 } },
    { key: "0", snapshot: parts, command: { type: "applyPreset", preset: "equal" } },
  ])("$key (Shift: $shiftKey) asks for $command", ({ key, shiftKey = false, snapshot, command }) => {
    expect(commandFor(press(key, { shiftKey }), context(snapshot))).toEqual(command);
  });

  it.each<{ case: string; key: string; snapshot?: Partial<PlayerSnapshot>; rest?: Partial<ShortcutContext> }>([
    { case: "Esc when nothing repeats", key: "Escape" },
    {
      case: "Esc while a popover is open, which closes itself",
      key: "Escape",
      snapshot: passage,
      rest: { layerOpen: true },
    },
    { case: "← while a popover is open", key: "ArrowLeft", rest: { layerOpen: true } },
    { case: "→ while the slider has focus", key: "ArrowRight", rest: { sliderFocused: true } },
    { case: "Home while the slider has focus", key: "Home", rest: { sliderFocused: true } },
    { case: "a number past the last part", key: "4", snapshot: parts },
    { case: "a number in a file without parts", key: "1" },
    { case: "0 in a file without parts", key: "0" },
    { case: "a key the player doesn't use", key: "x" },
  ])("leaves $case to the page", ({ key, snapshot, rest }) => {
    expect(commandFor(press(key), context(snapshot, rest))).toBeNull();
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { altKey: true }])(
    "leaves keys with %o to the browser",
    (modifier) => {
      expect(commandFor(press("a", modifier), context())).toBeNull();
    },
  );
});

describe("listedShortcuts", () => {
  it("lists 1–9 and 0 only for a file with parts", () => {
    const keys = (hasParts: boolean) => listedShortcuts({ hasBars: true, hasParts }).flatMap(({ keys }) => keys);

    expect(keys(true)).toEqual(expect.arrayContaining(["1–9", "0"]));
    expect(keys(false)).not.toContain("0");
  });

  it.each([false, true])("never mentions the unlisted K, I and O (bars: %s)", (hasBars) => {
    const listed = listedShortcuts({ hasBars, hasParts: true })
      .flatMap(({ keys, what }) => [...keys, what])
      .join(" ");
    expect(listed).not.toMatch(/\b[KIO]\b/);
  });

  it("moves by seconds in a file without bars, and by bars in one with them", () => {
    const arrows = (hasBars: boolean) =>
      listedShortcuts({ hasBars, hasParts: false }).find(({ keys }) => keys.includes("←"))?.what;

    expect(arrows(false)).toBe("5 sekunder bakåt / framåt");
    expect(arrows(true)).toBe("En takt bakåt / framåt");
  });
});
