import { describe, expect, it } from "vitest";

import {
  audibleGain,
  DEFAULT_GAIN,
  mixChanged,
  type MixPreset,
  presetMix,
  presetOf,
  presetOnChoosing,
} from "@/lib/player/mix";
import type { PlayerPart } from "@/lib/player/player";
import { part } from "@/lib/testing/player";

const parts = [part("S"), part("A"), part("T"), part("B")];

/** Applies a mix to `parts`, as the player would. */
function mixed(preset: MixPreset, mine: string | null, from: readonly PlayerPart[] = parts) {
  const mix = presetMix(preset, from, mine);
  return from.map((each) => ({ ...each, ...mix[each.id] }));
}

describe("presetMix", () => {
  it("Alla lika: every part at the same volume, none muted or soloed", () => {
    const messy = [part("S", { gain: 0.2, solo: true }), part("A", { muted: true }), part("T", { gain: 1 })];

    expect(mixed("equal", "A", messy).map(({ gain, muted, solo }) => ({ gain, muted, solo }))).toEqual([
      { gain: DEFAULT_GAIN, muted: false, solo: false },
      { gain: DEFAULT_GAIN, muted: false, solo: false },
      { gain: DEFAULT_GAIN, muted: false, solo: false },
    ]);
  });

  it("Framhäv min: my part louder, the others softer", () => {
    const [soprano, alto] = mixed("lift", "A");

    expect(alto.gain).toBeGreaterThan(DEFAULT_GAIN);
    expect(soprano.gain).toBeLessThan(DEFAULT_GAIN);
    expect(mixed("lift", "A").filter(({ gain }) => gain === soprano.gain)).toHaveLength(3);
  });

  it.each<{ preset: MixPreset; audible: string[] }>([
    { preset: "without", audible: ["S", "T", "B"] },
    { preset: "only", audible: ["A"] },
  ])("$preset with alto as my part: only $audible are heard", ({ preset, audible }) => {
    const result = mixed(preset, "A");

    expect(result.filter((each) => audibleGain(each, result) > 0).map(({ id }) => id)).toEqual(audible);
  });

  it("clears solos, so a preset is heard as it says", () => {
    const soloed = [part("S", { solo: true }), part("A"), part("T")];
    const result = mixed("only", "A", soloed);

    expect(result.some(({ solo }) => solo)).toBe(false);
    expect(audibleGain(result[1], result)).toBe(DEFAULT_GAIN);
  });

  it("leaves everything equal for a preset without my part", () => {
    expect(mixed("only", null)).toEqual(parts);
  });
});

describe("presetOf", () => {
  it.each<MixPreset>(["equal", "lift", "without", "only"])("recognises %s once applied", (preset) => {
    expect(presetOf(mixed(preset, "T"), "T")).toBe(preset);
  });

  it("is Alla lika for an untouched mix, with or without my part", () => {
    expect(presetOf(parts, null)).toBe("equal");
    expect(presetOf(parts, "S")).toBe("equal");
  });

  it("is none once a part is changed by hand", () => {
    const changed = mixed("lift", "T").map((each) => (each.id === "B" ? { ...each, muted: true } : each));

    expect(presetOf(changed, "T")).toBeNull();
    expect(presetOf([part("S", { solo: true }), part("A")], null)).toBeNull();
  });
});

describe("audibleGain", () => {
  it.each<{ name: string; parts: PlayerPart[]; heard: number[] }>([
    { name: "every part at its volume", parts: [part("S", { gain: 0.5 }), part("A")], heard: [0.5, DEFAULT_GAIN] },
    { name: "a muted part is silent", parts: [part("S", { muted: true }), part("A")], heard: [0, DEFAULT_GAIN] },
    { name: "a solo silences the others", parts: [part("S", { solo: true }), part("A")], heard: [DEFAULT_GAIN, 0] },
    {
      name: "several solos are heard together",
      parts: [part("S", { solo: true }), part("A", { solo: true }), part("T")],
      heard: [DEFAULT_GAIN, DEFAULT_GAIN, 0],
    },
    {
      name: "mute wins over solo",
      parts: [part("S", { solo: true, muted: true }), part("A")],
      heard: [0, 0],
    },
  ])("$name", ({ parts: mix, heard }) => {
    expect(mix.map((each) => audibleGain(each, mix))).toEqual(heard);
  });
});

describe("presetOnChoosing", () => {
  it("brings my part forward when I first choose it", () => {
    expect(presetOnChoosing(parts, null, "A")).toBe("lift");
  });

  it("keeps the preset when I choose another part", () => {
    expect(presetOnChoosing(mixed("only", "A"), "A", "T")).toBe("only");
  });

  it("brings my part forward when the mix was changed by hand", () => {
    const changed = mixed("only", "A").map((each) => (each.id === "B" ? { ...each, gain: 0.1 } : each));

    expect(presetOnChoosing(changed, "A", "T")).toBe("lift");
  });

  it("sets all parts equal when I let go of my part", () => {
    expect(presetOnChoosing(mixed("without", "A"), "A", null)).toBe("equal");
  });
});

describe("mixChanged", () => {
  it("is false only for piano with all parts equal", () => {
    expect(mixChanged(parts, "piano")).toBe(false);
    expect(mixChanged(parts, "choir")).toBe(true);
    expect(mixChanged(mixed("lift", "A"), "piano")).toBe(true);
  });
});
