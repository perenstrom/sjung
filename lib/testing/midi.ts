import { BasicMIDI } from "spessasynth_core";

/** Ticks per quarter note in the files `midiFile` builds. */
export const TICKS_PER_QUARTER = 480;

/** A MIDI event at `tick`, as its raw bytes. */
export type MidiEvent = { tick: number; bytes: number[] };

export const tempo = (tick: number, bpm: number): MidiEvent => {
  const micros = Math.round(60_000_000 / bpm);
  return { tick, bytes: [0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff] };
};

export const timeSignature = (tick: number, numerator: number, denominator: number): MidiEvent => ({
  tick,
  bytes: [0xff, 0x58, 0x04, numerator, Math.log2(denominator), 24, 8],
});

export const trackName = (name: string): MidiEvent => ({
  tick: 0,
  bytes: [0xff, 0x03, ...variableLength(name.length), ...ascii(name)],
});

/** Middle C on `channel` (0–15) for `length` ticks. */
export const note = (tick: number, length: number, channel = 0): MidiEvent[] => [
  { tick, bytes: [0x90 | channel, 60, 100] },
  { tick: tick + length, bytes: [0x80 | channel, 60, 0] },
];

/** A Standard MIDI File with one track per list of events: format 0 for one track, format 1 for more. */
export function midiFile(...tracks: MidiEvent[][]): BasicMIDI {
  const chunks = tracks.flatMap((events) => {
    const body: number[] = [];
    let last = 0;
    for (const { tick, bytes } of [...events].sort((a, b) => a.tick - b.tick)) {
      body.push(...variableLength(tick - last), ...bytes);
      last = tick;
    }
    body.push(0, 0xff, 0x2f, 0x00);
    return [...ascii("MTrk"), ...uint32(body.length), ...body];
  });
  const format = tracks.length > 1 ? 1 : 0;
  const bytes = [
    ...ascii("MThd"),
    ...uint32(6),
    0,
    format,
    0,
    tracks.length,
    TICKS_PER_QUARTER >> 8,
    TICKS_PER_QUARTER & 0xff,
    ...chunks,
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
