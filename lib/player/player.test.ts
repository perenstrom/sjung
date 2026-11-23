import { describe, expect, it } from "vitest";

import { formatTime, markLoop } from "@/lib/player/player";

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
