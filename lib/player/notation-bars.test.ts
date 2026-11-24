import { describe, expect, it } from "vitest";

import { type BarTickLookup, notationBarsOf, secondsAtTick, tickAtSeconds } from "@/lib/player/notation-bars";

/** A quarter note in alphaTab's MIDI ticks. */
const Q = 960;

/** A 4/4 bar of the score, `masterBar` counted from 0, played from `start` (in ticks), with any tempo changes in it. */
function lookup(masterBar: number, start: number, tempoChanges: BarTickLookup["tempoChanges"] = []): BarTickLookup {
  return { masterBar: { index: masterBar }, start, end: start + 4 * Q, tempoChanges };
}

describe("notationBarsOf", () => {
  it("times each bar as it is played, at the score's tempo until it changes", () => {
    // ♩ = 120: a 4/4 bar lasts 2 s; from bar 3 at ♩ = 60, 4 s.
    const bars = notationBarsOf([lookup(0, 0), lookup(1, 4 * Q), lookup(2, 8 * Q, [{ tick: 8 * Q, tempo: 60 }])], 120);

    expect(bars.map(({ start, end }) => [start, end])).toEqual([
      [0, 2],
      [2, 4],
      [4, 8],
    ]);
  });

  it("keeps a tempo that changes mid-bar for the rest of that bar and the bars after it", () => {
    const bars = notationBarsOf([lookup(0, 0, [{ tick: 2 * Q, tempo: 60 }]), lookup(1, 4 * Q)], 120);

    // Two beats at ♩ = 120 (1 s), two at ♩ = 60 (2 s), then a whole bar at ♩ = 60.
    expect(bars.map(({ start, end }) => [start, end])).toEqual([
      [0, 3],
      [3, 7],
    ]);
  });

  it("lists a bar that repeats each time it is played, numbered as in the score", () => {
    const bars = notationBarsOf([lookup(0, 0), lookup(1, 4 * Q), lookup(0, 8 * Q), lookup(1, 12 * Q)], 120);

    expect(bars.map(({ number, start }) => [number, start])).toEqual([
      [1, 0],
      [2, 2],
      [1, 4],
      [2, 6],
    ]);
  });
});

describe("secondsAtTick and tickAtSeconds", () => {
  const bars = notationBarsOf([lookup(0, 0), lookup(1, 4 * Q, [{ tick: 4 * Q, tempo: 60 }])], 120);

  it.each([
    [0, 0],
    [2 * Q, 1],
    [4 * Q, 2],
    [6 * Q, 4],
    [8 * Q, 6],
  ])("puts tick %i at %f s", (tick, seconds) => {
    expect(secondsAtTick(bars, tick)).toBe(seconds);
    expect(tickAtSeconds(bars, seconds)).toBe(tick);
  });

  it("keeps times past either end of the score at its ends", () => {
    expect(secondsAtTick(bars, 99 * Q)).toBe(6);
    expect(tickAtSeconds(bars, -1)).toBe(0);
    expect(tickAtSeconds(bars, 99)).toBe(8 * Q);
  });
});
