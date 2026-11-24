import { BasicPreset, BasicSoundBank } from "spessasynth_core";
import { describe, expect, it } from "vitest";

import { trimToPlayerPresets } from "@/lib/player/soundfont";

function bankWith(
  presets: {
    name: string;
    program: number;
    bankMSB?: number;
    isGMGSDrum?: boolean;
  }[],
) {
  const bank = new BasicSoundBank("sf2");
  for (const { name, program, bankMSB = 0, isGMGSDrum = false } of presets) {
    const preset = new BasicPreset(bank);
    preset.name = name;
    preset.program = program;
    preset.bankMSB = bankMSB;
    preset.isGMGSDrum = isGMGSDrum;
    bank.addPresets(preset);
  }
  bank.flush();
  return bank;
}

describe("trimToPlayerPresets", () => {
  it("keeps only the GM piano, choir aahs and voice oohs", () => {
    const bank = bankWith([
      { name: "Grand Piano", program: 0 },
      { name: "Bright Grand", program: 1 },
      { name: "Choir Aahs", program: 52 },
      { name: "Voice Oohs", program: 53 },
      { name: "Synth Voice", program: 54 },
      { name: "Piano 1w", program: 0, bankMSB: 8 },
      { name: "Choir Aahs 2", program: 52, bankMSB: 8 },
      { name: "Standard", program: 0, isGMGSDrum: true },
    ]);

    trimToPlayerPresets(bank);

    expect(bank.presets.map((preset) => preset.name)).toEqual(["Grand Piano", "Choir Aahs", "Voice Oohs"]);
  });

  it("throws when the bank lacks one of them", () => {
    const bank = bankWith([
      { name: "Grand Piano", program: 0 },
      { name: "Choir Aahs", program: 52 },
    ]);

    expect(() => trimToPlayerPresets(bank)).toThrow(/Voice Oohs/);
  });
});
