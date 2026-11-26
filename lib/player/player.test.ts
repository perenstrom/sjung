import { describe, expect, it } from "vitest";

import { barAt, clampTempo, formatTime, type Passage, playStart, repeatJump } from "@/lib/player/player";

describe("formatTime", () => {
  it.each([
    [0, "0:00"],
    [9.9, "0:09"],
    [65, "1:05"],
    [3600, "60:00"],
    [Number.NaN, "0:00"],
  ])("shows %s seconds as %s", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});

describe("barAt", () => {
  const bars = [0, 2, 4, 5.5];

  it.each([
    { seconds: 0, bar: 1 },
    { seconds: 1.99, bar: 1 },
    { seconds: 2, bar: 2 },
    { seconds: 5, bar: 3 },
    { seconds: 90, bar: 4 },
  ])("puts $seconds s in bar $bar", ({ seconds, bar }) => {
    expect(barAt(bars, seconds)).toBe(bar);
  });

  it("is null for a file without bars", () => {
    expect(barAt([], 12)).toBeNull();
  });
});

describe("clampTempo", () => {
  it.each([
    [75, 75],
    [200, 120],
    [10, 50],
    [87.6, 88],
  ])("keeps %s %% to %s %%", (asked, tempo) => {
    expect(clampTempo(asked)).toBe(tempo);
  });
});

describe("repeatJump", () => {
  it.each<{ passage: Passage | null; position: number; jump: number | null }>([
    { passage: null, position: 20.05, jump: null },
    { passage: { start: 10, end: null }, position: 30, jump: null },
    { passage: { start: 10, end: 20 }, position: 19.9, jump: null },
    { passage: { start: 10, end: 20 }, position: 20, jump: 10 },
    { passage: { start: 10, end: 20 }, position: 20.05, jump: 10 },
  ])("with passage $passage at $position s jumps to $jump", ({ passage, position, jump }) => {
    expect(repeatJump(passage, position)).toBe(jump);
  });
});

describe("playStart", () => {
  it.each<{ passage: Passage | null; position: number; start: number | null }>([
    { passage: null, position: 30, start: null },
    { passage: { start: 10, end: null }, position: 30, start: null },
    { passage: { start: 10, end: 20 }, position: 15, start: null },
    { passage: { start: 10, end: 20 }, position: 5, start: 10 },
    { passage: { start: 10, end: 20 }, position: 20, start: 10 },
    { passage: { start: 10, end: 20 }, position: 30, start: 10 },
  ])("with passage $passage at $position s starts at $start", ({ passage, position, start }) => {
    expect(playStart(passage, position)).toBe(start);
  });
});
