import { describe, expect, it } from "vitest";

import { barStartsOf } from "@/lib/player/midi-bars";
import { midiFile, note, tempo, TICKS_PER_QUARTER, timeSignature } from "@/lib/testing/midi";

const bars = (count: number) => count * 4 * TICKS_PER_QUARTER;

describe("barStartsOf", () => {
  it("starts a bar every four beats when the file sets no time signature", () => {
    // 120 bpm: a 4/4 bar lasts two seconds.
    expect(barStartsOf(midiFile([tempo(0, 120), ...note(0, bars(3))]))).toEqual([0, 2, 4]);
  });

  it("follows the time signature and its changes", () => {
    const midi = midiFile([
      tempo(0, 120),
      timeSignature(0, 3, 4),
      timeSignature(3 * TICKS_PER_QUARTER * 2, 6, 8),
      ...note(0, 3 * TICKS_PER_QUARTER * 4),
    ]);

    // Two bars of 3/4 (1.5 s each), then 6/8 (six quavers, also 1.5 s).
    expect(barStartsOf(midi)).toEqual([0, 1.5, 3, 4.5]);
  });

  it("follows the tempo and its changes", () => {
    expect(barStartsOf(midiFile([tempo(0, 120), tempo(bars(1), 60), ...note(0, bars(3))]))).toEqual([0, 2, 6]);
  });

  it("starts a new bar where the time signature changes mid-bar", () => {
    const midi = midiFile([
      tempo(0, 120),
      timeSignature(0, 4, 4),
      timeSignature(TICKS_PER_QUARTER, 2, 4),
      ...note(0, 4 * TICKS_PER_QUARTER),
    ]);

    // A pickup of one beat, then 2/4 bars of one second each.
    expect(barStartsOf(midi)).toEqual([0, 0.5, 1.5]);
  });
});
