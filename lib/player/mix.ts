import type { Player, PlayerPart, PlayerSound } from "@/lib/player/player";

/** A part's volume, mute and solo: what the mixer changes. */
export type PartMix = Pick<PlayerPart, "gain" | "muted" | "solo">;

/** Every part's volume until the singer changes it, from 0 to 1. Leaves room to bring one part up. */
export const DEFAULT_GAIN = 0.8;
/** Framhäv min: my part's volume, and every other part's. */
const LIFTED_GAIN = 1;
const LOWERED_GAIN = 0.3;

/** Every part's mix until the singer changes it, and after Alla lika. */
export const EQUAL_MIX: PartMix = { gain: DEFAULT_GAIN, muted: false, solo: false };

/**
 * The mixer's presets, for the singer's own part ("Min stämma"): Alla lika,
 * Framhäv min, Utan min and Bara min.
 */
export type MixPreset = "equal" | "lift" | "without" | "only";

export const MIX_PRESETS: readonly { preset: MixPreset; label: string }[] = [
  { preset: "equal", label: "Alla lika" },
  { preset: "lift", label: "Framhäv min" },
  { preset: "without", label: "Utan min" },
  { preset: "only", label: "Bara min" },
];

/**
 * The mix of each part, by id, for `preset` with `mine` as the singer's
 * part. A preset clears every solo, so it is heard as it says. Without a part
 * of their own, every preset leaves all parts equal.
 */
export function presetMix(
  preset: MixPreset,
  parts: readonly Pick<PlayerPart, "id">[],
  mine: string | null,
): Record<string, PartMix> {
  return Object.fromEntries(parts.map(({ id }) => [id, partMix(mine === null ? "equal" : preset, id === mine)]));
}

function partMix(preset: MixPreset, isMine: boolean): PartMix {
  switch (preset) {
    case "equal":
      return EQUAL_MIX;
    case "lift":
      return { ...EQUAL_MIX, gain: isMine ? LIFTED_GAIN : LOWERED_GAIN };
    case "without":
      return { ...EQUAL_MIX, muted: isMine };
    case "only":
      return { ...EQUAL_MIX, muted: !isMine };
  }
}

/**
 * The preset the parts are mixed as now, with `mine` as the singer's part;
 * `null` once a part has been changed by hand. Alla lika comes first, so an
 * untouched mix is that, whichever part is the singer's.
 */
export function presetOf(parts: readonly PlayerPart[], mine: string | null): MixPreset | null {
  const matches = (preset: MixPreset) => {
    const mix = presetMix(preset, parts, mine);
    return parts.every(({ id, gain, muted, solo }) => {
      const expected = mix[id];
      return gain === expected.gain && muted === expected.muted && solo === expected.solo;
    });
  };
  return MIX_PRESETS.map(({ preset }) => preset).find(matches) ?? null;
}

/** Whether the sound or the mix has been changed from the default: piano, all parts equal. */
export function mixChanged(parts: readonly PlayerPart[], sound: PlayerSound): boolean {
  return sound !== "piano" || presetOf(parts, null) !== "equal";
}

/**
 * The preset to mix with once the singer chooses `chosen` as their part,
 * having had `mine`: the same preset for another part, Framhäv min for a
 * first choice or over a mix changed by hand, and Alla lika when they let
 * go of their part.
 */
export function presetOnChoosing(parts: readonly PlayerPart[], mine: string | null, chosen: string | null): MixPreset {
  if (chosen === null) return "equal";
  const current = presetOf(parts, mine);
  return current === null || current === "equal" ? "lift" : current;
}

/**
 * How loud `part` is heard among `parts`, from 0: silent when muted, or when
 * another part is soloed and it isn't.
 */
export function audibleGain(part: PlayerPart, parts: readonly PlayerPart[]): number {
  const soloing = parts.some(({ solo }) => solo);
  return part.muted || (soloing && !part.solo) ? 0 : part.gain;
}

/** Sets every part of `player` to its mix in `mix`. */
export function applyMix(player: Player, mix: Record<string, PartMix>) {
  for (const [partId, change] of Object.entries(mix)) player.setPart(partId, change);
}
