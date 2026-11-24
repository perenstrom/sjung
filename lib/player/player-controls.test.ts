import { describe, expect, it } from "vitest";

import { EQUAL_MIX } from "@/lib/player/mix";
import type { Passage, PlayerSnapshot } from "@/lib/player/player";
import { createPlayerControls, type PlayerCommand } from "@/lib/player/player-controls";
import { fakePlayer, part } from "@/lib/testing/player";

/** Controls over a two-minute file at 0:30, changed by `snapshot`. */
function controlsOver(snapshot: Partial<PlayerSnapshot> = {}, { scoreTakesTaps = false } = {}) {
  const player = fakePlayer({ duration: 120, position: 30, ...snapshot });
  return { player, controls: createPlayerControls(player, { scoreTakesTaps }) };
}

/** Runs `command`, and returns its message and the player's snapshot after it. */
function run(command: PlayerCommand, snapshot: Partial<PlayerSnapshot> = {}) {
  const { player, controls } = controlsOver(snapshot);
  const message = controls.run(command);
  return { message, after: player.getSnapshot() };
}

/** 60 bars of two seconds each: bar 16 starts at 30 s. */
const bars = Array.from({ length: 60 }, (_, index) => index * 2);

describe("playing and moving", () => {
  it.each([
    { playing: false, after: true, message: "Spelar" },
    { playing: true, after: false, message: "Paus" },
  ])("togglePlay while playing is $playing: $message", ({ playing, after, message }) => {
    expect(run({ type: "togglePlay" }, { playing })).toMatchObject({ message, after: { playing: after } });
  });

  it.each([
    { by: -1, position: 30, seconds: 25, message: "−5 s" },
    { by: 1, position: 30, seconds: 35, message: "+5 s" },
    { by: -4, position: 30, seconds: 10, message: "−20 s" },
    { by: 4, position: 30, seconds: 50, message: "+20 s" },
    { by: -1, position: 2, seconds: 0, message: "−5 s" },
    { by: 1, position: 118, seconds: 120, message: "+5 s" },
  ])("stepBars $by at $position s without bars moves to $seconds s", ({ by, position, seconds, message }) => {
    expect(run({ type: "stepBars", by }, { position })).toMatchObject({ message, after: { position: seconds } });
  });

  it.each([
    { by: -1, position: 31, seconds: 28, message: "Takt 15" },
    { by: 1, position: 31, seconds: 32, message: "Takt 17" },
    { by: -4, position: 31, seconds: 22, message: "Takt 12" },
    { by: 4, position: 31, seconds: 38, message: "Takt 20" },
    { by: -1, position: 1, seconds: 0, message: "Takt 1" },
    { by: 1, position: 119, seconds: 118, message: "Takt 60" },
  ])("stepBars $by at $position s moves by bar: $message", ({ by, position, seconds, message }) => {
    expect(run({ type: "stepBars", by }, { bars, position })).toMatchObject({ message, after: { position: seconds } });
  });

  it("names bars by the number the score gives them when a repeat plays them again", () => {
    // Bars 1–2, repeated, then bar 3: bar 2 the second time round starts at 6 s.
    const repeated = { bars: [0, 2, 4, 6, 8], barNumbers: [1, 2, 1, 2, 3], position: 4.5 };

    expect(run({ type: "stepBars", by: 1 }, repeated)).toMatchObject({ message: "Takt 2", after: { position: 6 } });
    expect(run({ type: "markEnd" }, { ...repeated, passage: { start: 2, end: null } })).toMatchObject({
      message: "Repeterar takt 2–1",
      after: { passage: { start: 2, end: 6 } },
    });
  });

  it.each<{ passage: Passage | null; seconds: number; message: string }>([
    { passage: null, seconds: 0, message: "Till början" },
    { passage: { start: 12, end: null }, seconds: 0, message: "Till början" },
    { passage: { start: 12, end: 40 }, seconds: 12, message: "Till repetitionens start" },
  ])("rewind with passage $passage goes to $seconds s", ({ passage, seconds, message }) => {
    expect(run({ type: "rewind" }, { passage })).toMatchObject({ message, after: { position: seconds } });
  });
});

describe("marking a passage", () => {
  it.each<{
    command: PlayerCommand["type"];
    passage: Passage | null;
    position: number;
    expected: Passage;
    message: string;
  }>([
    {
      command: "markStart",
      passage: null,
      position: 30,
      expected: { start: 30, end: null },
      message: "Repetera härifrån – tryck B vid slutet",
    },
    {
      command: "markStart",
      passage: { start: 10, end: 50 },
      position: 30,
      expected: { start: 30, end: 50 },
      message: "Repeterar 0:30–0:50",
    },
    {
      command: "markStart",
      passage: { start: 10, end: 50 },
      position: 60,
      expected: { start: 60, end: null },
      message: "Repetera härifrån – tryck B vid slutet",
    },
    {
      command: "markEnd",
      passage: { start: 10, end: null },
      position: 30,
      expected: { start: 10, end: 30 },
      message: "Repeterar 0:10–0:30",
    },
    {
      command: "markEnd",
      passage: { start: 10, end: 50 },
      position: 30,
      expected: { start: 10, end: 30 },
      message: "Repeterar 0:10–0:30",
    },
    {
      command: "markEnd",
      passage: { start: 40, end: null },
      position: 30,
      expected: { start: 30, end: 40 },
      message: "Repeterar 0:30–0:40",
    },
    {
      command: "markEnd",
      passage: null,
      position: 30,
      expected: { start: 0, end: 30 },
      message: "Repeterar 0:00–0:30",
    },
  ])(
    "$command with passage $passage at $position s marks the playhead: $message",
    ({ command, passage, position, expected, message }) => {
      expect(run({ type: command } as PlayerCommand, { passage, position })).toEqual({
        message,
        after: expect.objectContaining({ passage: expected }),
      });
    },
  );

  it("leaves the passage when its end is marked at its start", () => {
    expect(run({ type: "markEnd" }, { passage: { start: 30, end: null }, position: 30 })).toMatchObject({
      message: "Sätt slutet efter starten",
      after: { passage: { start: 30, end: null } },
    });
  });

  it.each<{
    command: PlayerCommand["type"];
    passage: Passage | null;
    position: number;
    expected: Passage;
    message: string;
  }>([
    {
      command: "markStart",
      passage: null,
      position: 31,
      expected: { start: 30, end: null },
      message: "Repetera från takt 16 – tryck B vid slutet",
    },
    {
      command: "markStart",
      passage: { start: 20, end: 50 },
      position: 31,
      expected: { start: 30, end: 50 },
      message: "Repeterar takt 16–25",
    },
    {
      command: "markEnd",
      passage: { start: 30, end: null },
      position: 37,
      expected: { start: 30, end: 38 },
      message: "Repeterar takt 16–19",
    },
    {
      command: "markEnd",
      passage: { start: 30, end: null },
      position: 31,
      expected: { start: 30, end: 32 },
      message: "Repeterar takt 16",
    },
    {
      command: "markEnd",
      passage: { start: 30, end: null },
      position: 25,
      expected: { start: 24, end: 32 },
      message: "Repeterar takt 13–16",
    },
    {
      command: "markEnd",
      passage: null,
      position: 119,
      expected: { start: 0, end: 120 },
      message: "Repeterar takt 1–60",
    },
  ])(
    "$command with passage $passage at $position s marks whole bars: $message",
    ({ command, passage, position, expected, message }) => {
      expect(run({ type: command } as PlayerCommand, { bars, passage, position })).toEqual({
        message,
        after: expect.objectContaining({ passage: expected }),
      });
    },
  );

  it("stops repeating, and says nothing when nothing repeats", () => {
    expect(run({ type: "stopRepeating" }, { passage: { start: 10, end: 50 } })).toMatchObject({
      message: "Repeterar inte längre",
      after: { passage: null },
    });
    expect(run({ type: "stopRepeating" }).message).toBeNull();
  });
});

describe("the passage as the controls show it", () => {
  const passageOf = (snapshot: Partial<PlayerSnapshot>, scoreTakesTaps = false) =>
    controlsOver(snapshot, { scoreTakesTaps }).controls.getView().passage;

  it.each<{ passage: Passage | null; label: string | null; status: string; markButton: string }>([
    {
      passage: null,
      label: null,
      status: "Sätt start och slut för att repetera ett avsnitt.",
      markButton: "Start här",
    },
    {
      passage: { start: 12, end: null },
      label: null,
      status: "Start 0:12. Sätt slutet där avsnittet slutar.",
      markButton: "Slut här",
    },
    { passage: { start: 12, end: 30 }, label: "0:12–0:30", status: "Repeterar 0:12–0:30", markButton: "Start här" },
  ])("without bars, passage $passage reads $status", ({ passage, label, status, markButton }) => {
    expect(passageOf({ passage })).toMatchObject({ label, status, markButton });
  });

  it.each<{ passage: Passage | null; label: string | null; status: string }>([
    { passage: null, label: null, status: "Tryck på en takt i noterna där avsnittet börjar." },
    {
      passage: { start: 2, end: null },
      label: null,
      status: "Start: takt 2. Tryck på takten där avsnittet slutar.",
    },
    { passage: { start: 2, end: 6 }, label: "takt 2–3", status: "Repeterar takt 2–3" },
  ])("in a score that takes taps, passage $passage reads $status, with no button", ({ passage, label, status }) => {
    expect(passageOf({ bars: [0, 2, 4, 6], passage }, true)).toMatchObject({ label, status, markButton: null });
  });

  it.each<{ passage: Passage | null; label: string | null; status: string; markButton: string }>([
    {
      passage: null,
      label: null,
      status: "Sätt start och slut för att repetera ett avsnitt.",
      markButton: "Start här",
    },
    {
      passage: { start: 2, end: null },
      label: null,
      status: "Start: takt 2. Sätt slutet där avsnittet slutar.",
      markButton: "Slut här",
    },
    { passage: { start: 2, end: 6 }, label: "takt 2–3", status: "Repeterar takt 2–3", markButton: "Start här" },
  ])("with bars but no score to tap, passage $passage reads $status", ({ passage, label, status, markButton }) => {
    expect(passageOf({ bars: [0, 2, 4, 6], passage })).toMatchObject({ label, status, markButton });
  });
});

describe("the playhead and tempo as the controls show them", () => {
  it.each([
    { snapshot: { position: 83 }, label: "1:23" },
    { snapshot: { bars, position: 31 }, label: "0:31 · takt 16" },
    // Bars 1–2 repeated: at 4.5 s bar 1 plays the second time.
    { snapshot: { bars: [0, 2, 4, 6], barNumbers: [1, 2, 1, 2], position: 4.5 }, label: "0:04 · takt 1" },
  ])("labels the playhead $label", ({ snapshot, label }) => {
    expect(controlsOver(snapshot).controls.getView().playhead.label).toBe(label);
  });

  it.each([
    { by: -1, tempo: 100, expected: 95 },
    { by: 1, tempo: 100, expected: 105 },
    { by: -1, tempo: 50, expected: 50 },
    { by: 1, tempo: 120, expected: 120 },
  ])("stepTempo $by at $tempo % sets $expected %", ({ by, tempo, expected }) => {
    expect(run({ type: "stepTempo", by }, { tempo })).toMatchObject({
      message: `Tempo ${expected} %`,
      after: { tempo: expected },
    });
  });

  it("shows the tempo as changed away from 100 %", () => {
    const { controls } = controlsOver({ tempo: 100 });
    expect(controls.getView().tempo).toEqual({ percent: 100, changed: false });

    controls.run({ type: "setTempo", percent: 75 });

    expect(controls.getView().tempo).toEqual({ percent: 75, changed: true });
  });
});

describe("parts", () => {
  const parts = [part("Sopran"), part("Alt", { solo: true }), part("Tenor", { gain: 0.2, muted: true })];

  it.each([
    { partNumber: 1, message: "Solo: Sopran", solo: { Sopran: true, Alt: true } },
    { partNumber: 2, message: "Solo av: Alt", solo: { Sopran: false, Alt: false } },
  ])("toggleSolo $partNumber: $message", ({ partNumber, message, solo }) => {
    const { message: said, after } = run({ type: "toggleSolo", partNumber }, { parts });

    expect(said).toBe(message);
    expect(Object.fromEntries(after.parts.slice(0, 2).map(({ id, solo }) => [id, solo]))).toEqual(solo);
  });

  it("does nothing for a part number past the last", () => {
    expect(run({ type: "toggleSolo", partNumber: 4 }, { parts })).toMatchObject({ message: null, after: { parts } });
  });

  it("sets every part equal with Alla lika", () => {
    const { message, after } = run({ type: "applyPreset", preset: "equal" }, { parts });

    expect(message).toBe("Alla stämmor lika");
    expect(after.parts.map(({ gain, muted, solo }) => ({ gain, muted, solo }))).toEqual([
      EQUAL_MIX,
      EQUAL_MIX,
      EQUAL_MIX,
    ]);
  });

  it("lifts my part once I choose it, keeps the preset for another, and evens the mix when I let go", () => {
    const { player, controls } = controlsOver({ parts: [part("Sopran"), part("Alt")] });
    const gains = () => player.getSnapshot().parts.map(({ gain }) => gain);

    controls.run({ type: "chooseMine", partId: "Alt" });
    expect(controls.getView().parts).toMatchObject({ mine: "Alt", preset: "lift", changed: true });
    expect(gains()).toEqual([0.3, 1]);

    controls.run({ type: "applyPreset", preset: "without" });
    controls.run({ type: "chooseMine", partId: "Sopran" });
    expect(controls.getView().parts).toMatchObject({ mine: "Sopran", preset: "without" });
    expect(player.getSnapshot().parts.map(({ muted }) => muted)).toEqual([true, false]);

    controls.run({ type: "chooseMine", partId: null });
    expect(controls.getView().parts).toMatchObject({ mine: null, preset: "equal", changed: false });
  });

  it("shows which parts are heard while one is soloed", () => {
    const { controls } = controlsOver({ parts });

    expect(controls.getView().parts.list.map(({ id, heard }) => [id, heard])).toEqual([
      ["Sopran", false],
      ["Alt", true],
      ["Tenor", false],
    ]);
  });

  it("tells subscribers when the view changes, and keeps it the same object until then", () => {
    const { controls } = controlsOver({ parts: [part("Sopran")] });
    const before = controls.getView();
    let calls = 0;
    controls.subscribe(() => (calls += 1));

    expect(controls.getView()).toBe(before);
    controls.run({ type: "chooseMine", partId: "Sopran" });

    expect(calls).toBeGreaterThan(0);
    expect(controls.getView()).not.toBe(before);
  });
});
