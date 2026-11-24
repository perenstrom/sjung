import { describe, expect, it } from "vitest";

import { midiPartsOf, PERCUSSION_CHANNEL } from "@/lib/player/midi-parts";
import { midiFile, note, tempo, trackName } from "@/lib/testing/midi";

describe("midiPartsOf", () => {
  it("makes each track with notes a part, named as in the file, leaving out the tempo track", () => {
    const midi = midiFile(
      [trackName("Tempo"), tempo(0, 120)],
      [trackName("Sopran"), ...note(0, 480, 0)],
      [trackName("Alt"), ...note(0, 480, 1)],
    );

    expect(midiPartsOf(midi)).toEqual([
      { id: "track-1", name: "Sopran", percussion: false, channels: [0] },
      { id: "track-2", name: "Alt", percussion: false, channels: [1] },
    ]);
  });

  it("names a track without a name by its place among the parts", () => {
    const midi = midiFile(
      [tempo(0, 120)],
      [...note(0, 480, 0)],
      [trackName("Tenor"), ...note(0, 480, 1)],
      [...note(0, 480, 2)],
    );

    expect(midiPartsOf(midi).map(({ name }) => name)).toEqual(["Stämma 1", "Tenor", "Stämma 3"]);
  });

  it("marks a track that only plays drums as percussion", () => {
    const midi = midiFile(
      [trackName("Bas"), ...note(0, 480, 3)],
      [trackName("Trummor"), ...note(0, 480, PERCUSSION_CHANNEL)],
    );

    expect(midiPartsOf(midi).map(({ name, percussion }) => ({ name, percussion }))).toEqual([
      { name: "Bas", percussion: false },
      { name: "Trummor", percussion: true },
    ]);
  });

  it("keeps every channel a track plays on", () => {
    const midi = midiFile([trackName("Piano"), ...note(0, 480, 4), ...note(480, 480, 5)]);

    expect(midiPartsOf(midi)[0].channels).toEqual([4, 5]);
  });
});
