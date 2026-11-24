import type { BasicMIDI } from "spessasynth_core";

/** General MIDI's percussion channel, within each block of 16. */
export const PERCUSSION_CHANNEL = 9;

/**
 * A part of a MIDI file: one of its tracks, played on the synthesizer's
 * `channels` (with the offset for the track's port in a multi-port file).
 */
export type MidiPart = { id: string; name: string; percussion: boolean; channels: readonly number[] };

/**
 * The parts of a MIDI file (ADR-0010): its own tracks that play notes, in
 * order. Names come from the file only; a track without one is "Stämma n",
 * `n` being its place among the parts, as the number next to it in the
 * mixer. A track that only plays on the percussion channel is percussion.
 */
export function midiPartsOf(midi: BasicMIDI): MidiPart[] {
  return midi.tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => track.channels.size > 0)
    .map(({ track, index }, place) => {
      const offset = midi.portChannelOffsetMap[track.port] ?? 0;
      const channels = [...track.channels].sort((a, b) => a - b);
      return {
        id: `track-${index}`,
        name: track.name.trim() || `Stämma ${place + 1}`,
        percussion: channels.every((channel) => channel === PERCUSSION_CHANNEL),
        channels: channels.map((channel) => channel + offset),
      };
    });
}
