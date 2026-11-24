import { BasicMIDI } from "spessasynth_core";
import { describe, expect, it } from "vitest";

import { barStartsOf } from "@/lib/player/midi-bars";

const TICKS_PER_QUARTER = 480;

type Event = { tick: number; bytes: number[] };

const tempo = (tick: number, bpm: number): Event => {
  const micros = Math.round(60_000_000 / bpm);
  return { tick, bytes: [0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff] };
};
const timeSignature = (tick: number, numerator: number, denominator: number): Event => ({
  tick,
  bytes: [0xff, 0x58, 0x04, numerator, Math.log2(denominator), 24, 8],
});
const note = (tick: number, length: number): Event[] => [
  { tick, bytes: [0x90, 60, 100] },
  { tick: tick + length, bytes: [0x80, 60, 0] },
];

/** A one-track Standard MIDI File with these events. */
function midiFile(events: Event[]): BasicMIDI {
  const body: number[] = [];
  let last = 0;
  for (const { tick, bytes } of [...events].sort((a, b) => a.tick - b.tick)) {
    body.push(...variableLength(tick - last), ...bytes);
    last = tick;
  }
  body.push(0, 0xff, 0x2f, 0x00);
  const bytes = [
    ...ascii("MThd"),
    ...uint32(6),
    0,
    0,
    0,
    1,
    TICKS_PER_QUARTER >> 8,
    TICKS_PER_QUARTER & 0xff,
    ...ascii("MTrk"),
    ...uint32(body.length),
    ...body,
  ];
  return BasicMIDI.fromArrayBuffer(new Uint8Array(bytes).buffer);
}

function variableLength(value: number): number[] {
  const bytes = [value & 0x7f];
  for (let rest = value >> 7; rest > 0; rest >>= 7) bytes.unshift((rest & 0x7f) | 0x80);
  return bytes;
}
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
const uint32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];

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
