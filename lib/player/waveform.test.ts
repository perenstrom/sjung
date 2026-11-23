import { describe, expect, it } from "vitest";

import { peaksOf } from "@/lib/player/waveform";

describe("peaksOf", () => {
  it("gives each bar the loudest sample in its stretch of any channel, scaled so the loudest bar is 1", () => {
    const left = Float32Array.from([0.0625, -0.125, 0.03125, 0.0625, 0, 0.25, -0.0625, 0.0625]);
    const right = Float32Array.from([0, 0.0625, -0.1875, 0, 0, 0.0625, 0.125, -0.5]);

    expect(peaksOf([left, right], 4)).toEqual([0.25, 0.375, 0.5, 1]);
  });

  it("gives silence flat bars", () => {
    expect(peaksOf([new Float32Array(8)], 4)).toEqual([0, 0, 0, 0]);
  });

  it("gives a file shorter than the strip one bar per sample", () => {
    expect(peaksOf([Float32Array.from([0.5, -1])], 4)).toEqual([0.5, 1]);
  });
});
