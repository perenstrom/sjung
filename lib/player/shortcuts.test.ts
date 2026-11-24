import { describe, expect, it } from "vitest";

import { DEFAULT_GAIN } from "@/lib/player/mix";
import { IDLE_SNAPSHOT, type Loop, type PlayerPart, type PlayerSnapshot } from "@/lib/player/player";
import { type KeyPress, listedShortcuts, shortcutFor, type ShortcutContext } from "@/lib/player/shortcuts";

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
    expect(shortcutFor(press("ArrowRight"), context({ position: 118 }))?.action).toEqual({
      type: "seek",
      seconds: 120,
    });
  });

  it.each<{ loop: Loop | null; seconds: number; hud: string }>([
    { loop: null, seconds: 0, hud: "Till början" },
    { loop: { start: 12, end: null }, seconds: 0, hud: "Till början" },
    { loop: { start: 12, end: 40 }, seconds: 12, hud: "Till repetitionens start" },
  ])("Home with passage $loop goes to $seconds s", ({ loop, seconds, hud }) => {
    expect(shortcutFor(press("Home"), context({ loop }))).toEqual({ action: { type: "seek", seconds }, hud });
  });

  it.each<{ key: string; loop: Loop | null; position: number; expected: Loop; hud: string }>([
    {
      key: "a",
      loop: null,
      position: 30,
      expected: { start: 30, end: null },
      hud: "Repetera härifrån – tryck B vid slutet",
    },
    {
      key: "I",
      loop: null,
      position: 30,
      expected: { start: 30, end: null },
      hud: "Repetera härifrån – tryck B vid slutet",
    },
    {
      key: "A",
      loop: { start: 10, end: 50 },
      position: 30,
      expected: { start: 30, end: 50 },
      hud: "Repeterar 0:30–0:50",
    },
    {
      key: "a",
      loop: { start: 10, end: 50 },
      position: 60,
      expected: { start: 60, end: null },
      hud: "Repetera härifrån – tryck B vid slutet",
    },
    {
      key: "b",
      loop: { start: 10, end: null },
      position: 30,
      expected: { start: 10, end: 30 },
      hud: "Repeterar 0:10–0:30",
    },
    {
      key: "O",
      loop: { start: 10, end: 50 },
      position: 30,
      expected: { start: 10, end: 30 },
      hud: "Repeterar 0:10–0:30",
    },
    {
      key: "B",
      loop: { start: 40, end: null },
      position: 30,
      expected: { start: 30, end: 40 },
      hud: "Repeterar 0:30–0:40",
    },
    { key: "b", loop: null, position: 30, expected: { start: 0, end: 30 }, hud: "Repeterar 0:00–0:30" },
  ])("$key with passage $loop at $position s repeats $expected", ({ key, loop, position, expected, hud }) => {
    expect(shortcutFor(press(key), context({ loop, position }))).toEqual({
      action: { type: "loop", loop: expected },
      hud,
    });
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

  it.each([{ metaKey: true }, { ctrlKey: true }, { altKey: true }])(
    "leaves keys with %o to the browser",
    (modifier) => {
      expect(shortcutFor(press("a", modifier), context())).toBeNull();
    },
  );

  it("ignores other keys", () => {
    expect(shortcutFor(press("x"), context())).toBeNull();
  });
});

describe("shortcutFor in a file with bars", () => {
  /** 60 bars of two seconds each: bar 16 starts at 30 s. */
  const bars = Array.from({ length: 60 }, (_, index) => index * 2);
  const inBars = (snapshot: Partial<PlayerSnapshot> = {}) => context({ bars, position: 31, ...snapshot });

  it.each([
    { key: "ArrowLeft", shiftKey: false, position: 31, seconds: 28, hud: "Takt 15" },
    { key: "ArrowRight", shiftKey: false, position: 31, seconds: 32, hud: "Takt 17" },
    { key: "ArrowLeft", shiftKey: true, position: 31, seconds: 22, hud: "Takt 12" },
    { key: "ArrowRight", shiftKey: true, position: 31, seconds: 38, hud: "Takt 20" },
    { key: "ArrowLeft", shiftKey: false, position: 1, seconds: 0, hud: "Takt 1" },
    { key: "ArrowRight", shiftKey: false, position: 119, seconds: 118, hud: "Takt 60" },
  ])("$key (Shift: $shiftKey) at $position s moves to bar $hud", ({ key, shiftKey, position, seconds, hud }) => {
    expect(shortcutFor(press(key, { shiftKey }), inBars({ position }))).toEqual({
      action: { type: "seek", seconds },
      hud,
    });
  });

  it.each<{ key: string; loop: Loop | null; position: number; expected: Loop; hud: string }>([
    {
      key: "a",
      loop: null,
      position: 31,
      expected: { start: 30, end: null },
      hud: "Repetera från takt 16 – tryck B vid slutet",
    },
    {
      key: "A",
      loop: { start: 20, end: 50 },
      position: 31,
      expected: { start: 30, end: 50 },
      hud: "Repeterar takt 16–25",
    },
    {
      key: "b",
      loop: { start: 30, end: null },
      position: 37,
      expected: { start: 30, end: 38 },
      hud: "Repeterar takt 16–19",
    },
    {
      key: "b",
      loop: { start: 30, end: null },
      position: 31,
      expected: { start: 30, end: 32 },
      hud: "Repeterar takt 16",
    },
    {
      key: "B",
      loop: { start: 30, end: null },
      position: 25,
      expected: { start: 24, end: 32 },
      hud: "Repeterar takt 13–16",
    },
    { key: "b", loop: null, position: 119, expected: { start: 0, end: 120 }, hud: "Repeterar takt 1–60" },
  ])("$key with passage $loop at $position s marks whole bars: $hud", ({ key, loop, position, expected, hud }) => {
    expect(shortcutFor(press(key), inBars({ loop, position }))).toEqual({
      action: { type: "loop", loop: expected },
      hud,
    });
  });
});

describe("shortcutFor in a file with parts", () => {
  const part = (name: string, change: Partial<PlayerPart> = {}): PlayerPart => ({
    id: name.toLowerCase(),
    name,
    percussion: false,
    gain: DEFAULT_GAIN,
    muted: false,
    solo: false,
    ...change,
  });
  const parts = [part("Sopran"), part("Alt", { solo: true }), part("Tenor", { gain: 0.2, muted: true })];

  it.each([
    { key: "1", expected: { action: { type: "part", partId: "sopran", change: { solo: true } }, hud: "Solo: Sopran" } },
    { key: "2", expected: { action: { type: "part", partId: "alt", change: { solo: false } }, hud: "Solo av: Alt" } },
  ])("$key toggles solo on part $key", ({ key, expected }) => {
    expect(shortcutFor(press(key), context({ parts }))).toEqual(expected);
  });

  it("leaves a number past the last part, and the numbers in a file without parts, to the page", () => {
    expect(shortcutFor(press("4"), context({ parts }))).toBeNull();
    expect(shortcutFor(press("1"), context())).toBeNull();
    expect(shortcutFor(press("0"), context())).toBeNull();
  });

  it("0 sets all parts equal", () => {
    const equal = { gain: DEFAULT_GAIN, muted: false, solo: false };

    expect(shortcutFor(press("0"), context({ parts }))).toEqual({
      action: { type: "mix", mix: { sopran: equal, alt: equal, tenor: equal } },
      hud: "Alla stämmor lika",
    });
  });
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
