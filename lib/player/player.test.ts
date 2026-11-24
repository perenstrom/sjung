import { describe, expect, it } from "vitest";

import { barAt, formatTime, markLoop } from "@/lib/player/player";

describe("markLoop", () => {
  it.each([
    { case: "no passage yet: Start här", loop: null, at: 12, expected: { start: 12, end: null } },
    { case: "a start: Slut här after it", loop: { start: 12, end: null }, at: 30, expected: { start: 12, end: 30 } },
    { case: "a start: Slut här before it swaps them", loop: { start: 12, end: null }, at: 5, expected: { start: 5, end: 12 } },
    { case: "a whole passage: Start här begins a new one", loop: { start: 12, end: 30 }, at: 40, expected: { start: 40, end: null } },
  ])("$case", ({ loop, at, expected }) => {
    expect(markLoop(loop, at)).toEqual(expected);
  });

  it("keeps marking when the end is marked at the start", () => {
    expect(markLoop({ start: 12, end: null }, 12)).toEqual({ start: 12, end: null });
  });
});

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
