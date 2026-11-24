import { describe, expect, it } from "vitest";

import { playbackOf } from "@/lib/pieces/playback";

describe("playbackOf", () => {
  it.each([
    ["an audio File", "Sopran.mp3", null, "ready"],
    ["a MusicXML File", "Partitur.mxl", null, "ready"],
    ["a MuseScore File being converted", "Partitur.mscz", "PENDING", "preparing"],
    ["a converted MuseScore File", "Partitur.mscz", "READY", "ready"],
    ["a MuseScore File that couldn't be converted", "Partitur.mscz", "FAILED", "failed"],
  ] as const)("for %s (%s, %s) is %s", (_case, fileName, conversionState, expected) => {
    expect(playbackOf({ fileName, conversionState })).toBe(expected);
  });

  it("is null for a File that isn't a Playable File", () => {
    expect(playbackOf({ fileName: "Noter.pdf", conversionState: null })).toBeNull();
  });
});
