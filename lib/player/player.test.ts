import { describe, expect, it } from "vitest";

import { barAt, formatTime } from "@/lib/player/player";

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
