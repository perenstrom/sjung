import type { BasicPreset, BasicSoundBank } from "spessasynth_core";

import type { PlayerSound } from "@/lib/player/player";

/**
 * Where the player's soundfont lives in object storage: GeneralUser GS,
 * trimmed by `scripts/build-soundfont.ts`. Outside `groups/`, so no Group's
 * cleanup ever deletes it. A build that changes the soundfont must bump the
 * key, so no browser keeps playing a cached old copy.
 */
export const PLAYER_SOUNDFONT_KEY = "player/soundfonts/generaluser-gs-2.0.3-player-drums.sf3";

/**
 * The General MIDI programs the player's soundfont keeps (ADR-0010). Both
 * engines play every pitched part with one of these.
 */
export const PLAYER_PROGRAMS = [
  { program: 0, name: "Acoustic Grand Piano" },
  { program: 52, name: "Choir Aahs" },
  { program: 53, name: "Voice Oohs" },
] as const;

/**
 * The one drum kit the player's soundfont keeps: the GM/GS Standard kit
 * (SF2 bank 128, preset 0). Percussion parts play it whatever kit their File
 * asks for, since both engines fall back to it. A kit, not a program: it is
 * never one of the player's sounds.
 */
export const PLAYER_DRUM_KIT = { program: 0, name: "Standard" } as const;

/** The program from {@link PLAYER_PROGRAMS} each of the player's sounds plays every part with. */
export const SOUND_PROGRAMS: Record<PlayerSound, number> = {
  piano: PLAYER_PROGRAMS[0].program,
  choir: PLAYER_PROGRAMS[1].program,
};

/**
 * Trims a General MIDI soundfont, in place, to the player's presets: the plain GM
 * (bank 0, not drum) presets for {@link PLAYER_PROGRAMS} and the GM/GS drum
 * preset for {@link PLAYER_DRUM_KIT}. Every other preset goes, and so do the
 * instruments and samples only they used.
 * Throws if the bank lacks one of the programs or the kit.
 */
export function trimToPlayerPresets(bank: BasicSoundBank): void {
  const kept = new Set([
    ...PLAYER_PROGRAMS.map((program) => findPreset(bank, program, "GM program")),
    findPreset(bank, PLAYER_DRUM_KIT, "GM/GS drum kit"),
  ]);

  for (const preset of [...bank.presets]) {
    if (!kept.has(preset)) {
      bank.deletePreset(preset);
    }
  }
  bank.removeUnusedElements();
  bank.flush();
}

/**
 * The bank's preset for `program`: the plain GM one (bank 0, not drum) for a
 * GM program, the GM/GS drum one (SF2 bank 128) for a drum kit.
 * Throws, naming the preset, if the bank has none.
 */
function findPreset(
  bank: BasicSoundBank,
  { program, name }: { program: number; name: string },
  kind: "GM program" | "GM/GS drum kit",
): BasicPreset {
  const isGMGSDrum = kind === "GM/GS drum kit";
  const preset = bank.presets.find(
    (candidate) =>
      candidate.isGMGSDrum === isGMGSDrum &&
      candidate.bankMSB === 0 &&
      candidate.bankLSB === 0 &&
      candidate.program === program,
  );
  if (!preset) {
    throw new Error(`The soundfont has no ${kind} ${program} (${name}).`);
  }
  return preset;
}
