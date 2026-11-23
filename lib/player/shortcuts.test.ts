import { describe, expect, it } from "vitest";

import { IDLE_SNAPSHOT, type Loop, type PlayerSnapshot } from "@/lib/player/player";
import { LISTED_SHORTCUTS, type KeyPress, shortcutFor, type ShortcutContext } from "@/lib/player/shortcuts";

function context(snapshot: Partial<PlayerSnapshot> = {}, rest: Partial<Omit<ShortcutContext, "snapshot">> = {}) {
  return {
    snapshot: { ...IDLE_SNAPSHOT, status: "ready", duration: 120, position: 30, ...snapshot },
    layerOpen: false,
    sliderFocused: false,
    ...rest,
  } satisfies ShortcutContext;
}

function press(key: string, modifiers: Partial<Omit<KeyPress, "key">> = {}): KeyPress {
  return { key, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...modifiers };
}

describe("shortcutFor", () => {
  it.each([
    { key: " ", playing: false, expected: { action: { type: "play" }, hud: "Spelar" } },
    { key: " ", playing: true, expected: { action: { type: "pause" }, hud: "Paus" } },
    { key: "k", playing: false, expected: { action: { type: "play" }, hud: "Spelar" } },
    { key: "K", playing: true, expected: { action: { type: "pause" }, hud: "Paus" } },
  ])("$key plays or pauses (playing: $playing)", ({ key, playing, expected }) => {
    expect(shortcutFor(press(key), context({ playing }))).toEqual(expected);
  });

  it.each([
    { key: "ArrowLeft", shiftKey: false, seconds: 25, hud: "−5 s" },
    { key: "ArrowRight", shiftKey: false, seconds: 35, hud: "+5 s" },
    { key: "ArrowLeft", shiftKey: true, seconds: 10, hud: "−20 s" },
    { key: "ArrowRight", shiftKey: true, seconds: 50, hud: "+20 s" },
  ])("$key (Shift: $shiftKey) moves an audio file to $seconds s", ({ key, shiftKey, seconds, hud }) => {
    expect(shortcutFor(press(key, { shiftKey }), context())).toEqual({ action: { type: "seek", seconds }, hud });
  });

  it("keeps the arrows within the file", () => {
    expect(shortcutFor(press("ArrowLeft"), context({ position: 2 }))?.action).toEqual({ type: "seek", seconds: 0 });
    expect(shortcutFor(press("ArrowRight"), context({ position: 118 }))?.action).toEqual({ type: "seek", seconds: 120 });
  });

  it.each<{ loop: Loop | null; seconds: number; hud: string }>([
    { loop: null, seconds: 0, hud: "Till början" },
    { loop: { start: 12, end: null }, seconds: 0, hud: "Till början" },
    { loop: { start: 12, end: 40 }, seconds: 12, hud: "Till repetitionens start" },
  ])("Home with passage $loop goes to $seconds s", ({ loop, seconds, hud }) => {
    expect(shortcutFor(press("Home"), context({ loop }))).toEqual({ action: { type: "seek", seconds }, hud });
  });

  it.each<{ key: string; loop: Loop | null; position: number; expected: Loop; hud: string }>([
    { key: "a", loop: null, position: 30, expected: { start: 30, end: null }, hud: "Repetera härifrån – tryck B vid slutet" },
    { key: "I", loop: null, position: 30, expected: { start: 30, end: null }, hud: "Repetera härifrån – tryck B vid slutet" },
    { key: "A", loop: { start: 10, end: 50 }, position: 30, expected: { start: 30, end: 50 }, hud: "Repeterar 0:30–0:50" },
    { key: "a", loop: { start: 10, end: 50 }, position: 60, expected: { start: 60, end: null }, hud: "Repetera härifrån – tryck B vid slutet" },
    { key: "b", loop: { start: 10, end: null }, position: 30, expected: { start: 10, end: 30 }, hud: "Repeterar 0:10–0:30" },
    { key: "O", loop: { start: 10, end: 50 }, position: 30, expected: { start: 10, end: 30 }, hud: "Repeterar 0:10–0:30" },
    { key: "B", loop: { start: 40, end: null }, position: 30, expected: { start: 30, end: 40 }, hud: "Repeterar 0:30–0:40" },
    { key: "b", loop: null, position: 30, expected: { start: 0, end: 30 }, hud: "Repeterar 0:00–0:30" },
  ])("$key with passage $loop at $position s repeats $expected", ({ key, loop, position, expected, hud }) => {
    expect(shortcutFor(press(key), context({ loop, position }))).toEqual({ action: { type: "loop", loop: expected }, hud });
  });

  it("leaves the passage when B is pressed at its start", () => {
    expect(shortcutFor(press("b"), context({ loop: { start: 30, end: null }, position: 30 }))).toEqual({
      action: null,
      hud: "Sätt slutet efter starten",
    });
  });

  it.each([
    { key: "-", tempo: 100, expected: 95 },
    { key: "+", tempo: 100, expected: 105 },
    { key: "=", tempo: 100, expected: 105 },
    { key: "-", tempo: 50, expected: 50 },
    { key: "+", tempo: 120, expected: 120 },
  ])("$key at $tempo % sets the tempo to $expected %", ({ key, tempo, expected }) => {
    expect(shortcutFor(press(key), context({ tempo }))).toEqual({
      action: { type: "tempo", percent: expected },
      hud: `Tempo ${expected} %`,
    });
  });

  it("Esc stops repeating", () => {
    expect(shortcutFor(press("Escape"), context({ loop: { start: 10, end: 50 } }))).toEqual({
      action: { type: "loop", loop: null },
      hud: "Repeterar inte längre",
    });
  });

  it.each([
    { case: "nothing repeats", loop: null, layerOpen: false },
    { case: "a popover is open, which closes itself", loop: { start: 10, end: 50 }, layerOpen: true },
  ])("Esc does nothing when $case", ({ loop, layerOpen }) => {
    expect(shortcutFor(press("Escape"), context({ loop }, { layerOpen }))).toBeNull();
  });

  it("? opens or closes the list of shortcuts", () => {
    expect(shortcutFor(press("?", { shiftKey: true }), context())).toEqual({ action: { type: "help" }, hud: null });
  });

  it.each([
    { case: "a popover is open", rest: { layerOpen: true } },
    { case: "the slider has focus", rest: { sliderFocused: true } },
  ])("leaves the arrows and Home to the page when $case", ({ rest }) => {
    for (const key of ["ArrowLeft", "ArrowRight", "Home"]) {
      expect(shortcutFor(press(key), context({}, rest))).toBeNull();
    }
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { altKey: true }])("leaves keys with %o to the browser", (modifier) => {
    expect(shortcutFor(press("a", modifier), context())).toBeNull();
  });

  it("ignores other keys", () => {
    expect(shortcutFor(press("x"), context())).toBeNull();
  });
});

describe("LISTED_SHORTCUTS", () => {
  it("never mentions the unlisted K, I and O", () => {
    const listed = LISTED_SHORTCUTS.flatMap(({ keys, what }) => [...keys, what]).join(" ");
    expect(listed).not.toMatch(/\b[KIO]\b/);
  });
});
