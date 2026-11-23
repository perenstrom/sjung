import type { BasicPreset, BasicSoundBank } from "spessasynth_core";

/**
 * Where the player's soundfont lives in object storage: GeneralUser GS,
 * trimmed by `scripts/build-soundfont.ts`. Outside `groups/`, so no Group's
 * cleanup ever deletes it. A build that changes the soundfont must bump the
 * key, so no browser keeps playing a cached old copy.
 */
export const PLAYER_SOUNDFONT_KEY = "player/soundfonts/generaluser-gs-2.0.3-player.sf3";

/**
 * The General MIDI programs the player's soundfont keeps (ADR-0010). Both
 * engines play every part with one of these.
 */
export const PLAYER_PROGRAMS = [
  { program: 0, name: "Acoustic Grand Piano" },
  { program: 52, name: "Choir Aahs" },
  { program: 53, name: "Voice Oohs" },
] as const;

/**
 * Trims a General MIDI soundfont, in place, to the player's presets: the plain GM
 * (bank 0, not drum) presets for {@link PLAYER_PROGRAMS}. Every other preset
 * goes, and so do the instruments and samples only they used.
 * Throws if the bank lacks one of the programs.
 */
export function trimToPlayerPresets(bank: BasicSoundBank): void {
  const kept = new Set<BasicPreset>();
  for (const { program, name } of PLAYER_PROGRAMS) {
    const preset = bank.presets.find((candidate) => isPlainGM(candidate) && candidate.program === program);
    if (!preset) {
      throw new Error(`The soundfont has no GM program ${program} (${name}).`);
    }
    kept.add(preset);
  }

  for (const preset of [...bank.presets]) {
    if (!kept.has(preset)) {
      bank.deletePreset(preset);
    }
  }
  bank.removeUnusedElements();
  bank.flush();
}

function isPlainGM(preset: BasicPreset): boolean {
  return !preset.isGMGSDrum && preset.bankMSB === 0 && preset.bankLSB === 0;
}
