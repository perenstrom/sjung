import type { BasicMIDI } from "spessasynth_core";

/** A time signature meta event's status, as SpessaSynth reads it. */
const TIME_SIGNATURE = 0x58;

type TimeSignature = { tick: number; numerator: number; denominator: number };

/**
 * When each bar of a MIDI file starts, in seconds at the file's own tempo,
 * up to its last note. A file that sets no time signature is in 4/4, as MIDI
 * says. A time signature that changes mid-bar starts a new bar there, so a
 * pickup counts as a bar of its own.
 */
export function barStartsOf(midi: BasicMIDI): number[] {
  const signatures = timeSignaturesOf(midi);
  const end = midi.lastVoiceEventTick;
  const starts: number[] = [];

  let tick = 0;
  for (const [index, signature] of signatures.entries()) {
    const until = Math.min(signatures[index + 1]?.tick ?? end, end);
    const barTicks = (midi.timeDivision * 4 * signature.numerator) / signature.denominator;
    for (tick = Math.max(tick, signature.tick); tick < until; tick += barTicks) {
      starts.push(midi.midiTicksToSeconds(tick));
    }
    tick = until;
  }
  return starts.length > 0 ? starts : [0];
}

/** The file's time signatures in order, one per tick, starting with 4/4 unless it sets one at the start. */
function timeSignaturesOf(midi: BasicMIDI): TimeSignature[] {
  const byTick = new Map<number, TimeSignature>([[0, { tick: 0, numerator: 4, denominator: 4 }]]);
  const events = midi.tracks
    .flatMap((track) => track.events)
    .filter((event) => event.statusByte === TIME_SIGNATURE && event.data.length >= 2)
    .sort((a, b) => a.ticks - b.ticks);
  for (const event of events) {
    const [numerator, denominatorPower] = event.data;
    if (numerator > 0) byTick.set(event.ticks, { tick: event.ticks, numerator, denominator: 2 ** denominatorPower });
  }
  return [...byTick.values()].sort((a, b) => a.tick - b.tick);
}
