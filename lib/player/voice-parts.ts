import type * as AlphaTab from "@coderline/alphatab";

import { PERCUSSION_CHANNEL } from "@/lib/player/midi-parts";
import { type AlphaTabModule, beatsOf, isPercussion } from "@/lib/player/musicxml-score";
import type { NotationPart } from "@/lib/player/notation-player";
import { partName } from "@/lib/player/player";

type Score = AlphaTab.model.Score;
type Track = AlphaTab.model.Track;
/** A score, track, voice and so on in alphaTab's JSON form (`JsonConverter`). */
type Json = Map<string, unknown>;

/** The channel every drawn staff whose voices are heard on their own tracks shares, silent. */
const DRAWN_CHANNEL = 15;
/** The channels left for the parts heard, one each. */
const PART_CHANNELS = Array.from({ length: 16 }, (_, channel) => channel).filter(
  (channel) => channel !== PERCUSSION_CHANNEL && channel !== DRAWN_CHANNEL,
);
/** The most parts a score can have besides percussion, as each needs its own channel. */
const MAX_PARTS = PART_CHANNELS.length;

/**
 * A score whose `parts` are what the mixer mixes, and `drawn` the tracks of
 * the file, to draw.
 */
export type VoiceParts = { score: Score; drawn: number[]; parts: NotationPart[] };

/**
 * Gives each voice on a shared staff a part of its own (ADR-0010). alphaTab
 * mixes per track, so every staff with two or more voices gets one hidden
 * track per voice, appended after the file's own, and the drawn track is
 * silent for good. Its parts are named "<staff name> 1 / 2", 1 being the
 * upper voice. Where a voice has nothing in a bar, its part plays the upper
 * voice there, as a unison written once.
 *
 * Each part plays on a MIDI channel of its own, so a score has at most
 * `MAX_PARTS` parts besides percussion: staves are split in order only while
 * they fit, and the rest stay one part each. A staff with one voice, a track
 * with more than one staff and percussion keep their own track, which is
 * then their part.
 */
export function voicePartsOf(at: AlphaTabModule, score: Score, settings: AlphaTab.Settings): VoiceParts {
  const drawn = score.tracks.map(({ index }) => index);
  let partCount = score.tracks.filter((track) => !isPercussion(track)).length;
  const parts: NotationPart[] = [];
  /** The hidden tracks to add, in order after the file's own. */
  const hiddenTracks: { from: number; voice: number; name: string }[] = [];
  for (const track of score.tracks) {
    const voices = voicesOf(track);
    if (voices.length < 2 || partCount + voices.length - 1 > MAX_PARTS) {
      parts.push(partOf(track.name, isPercussion(track), track.index, parts.length));
      continue;
    }
    partCount += voices.length - 1;
    voices.forEach((voice, place) => {
      const name = track.name.trim() && `${track.name.trim()} ${place + 1}`;
      hiddenTracks.push({ from: track.index, voice, name });
      parts.push(partOf(name, false, score.tracks.length + hiddenTracks.length - 1, parts.length));
    });
  }
  if (hiddenTracks.length === 0) return { score, drawn, parts };

  const json = at.model.JsonConverter.scoreToJsObject(score) as Json;
  const tracks = json.get("tracks") as Json[];
  for (const { from, voice, name } of hiddenTracks) tracks.push(voiceTrack(tracks[from], voice, name));
  const splitScore = at.model.JsonConverter.jsObjectToScore(json, settings);

  const silenced = new Set(hiddenTracks.map(({ from }) => from));
  const channels = [...PART_CHANNELS];
  for (const track of splitScore.tracks) {
    if (isPercussion(track)) continue;
    if (silenced.has(track.index)) silence(at, track);
    // Never runs out: no more than MAX_PARTS tracks are heard once a staff is split.
    else playOn(track, channels.shift() ?? DRAWN_CHANNEL);
  }
  return { score: splitScore, drawn, parts };
}

/** The part a track plays, named as the file names it, or after its `place` among the parts. */
function partOf(name: string, percussion: boolean, track: number, place: number): NotationPart {
  return { id: `track-${track}`, name: partName(name, place), percussion, track };
}

/**
 * The voices of `track` that play notes, upper first, when it has one staff
 * that isn't percussion; otherwise none, as it isn't split.
 */
function voicesOf(track: Track): number[] {
  const [staff, ...more] = track.staves;
  if (!staff || more.length > 0 || staff.isPercussion) return [];
  const voices = new Set<number>();
  for (const bar of staff.bars) {
    bar.voices.forEach((voice, index) => {
      if (voice.beats.some((beat) => beat.notes.length > 0)) voices.add(index);
    });
  }
  return [...voices].sort((a, b) => a - b);
}

/**
 * A copy of `track` (in JSON form) holding only `voice`, or the upper voice
 * in a bar where `voice` has nothing, named `name`. Without ids, so alphaTab
 * gives its beats and notes new ones.
 */
function voiceTrack(track: Json, voice: number, name: string): Json {
  const copy = structuredClone(track);
  withoutIds(copy);
  for (const staff of copy.get("staves") as Json[]) {
    for (const bar of staff.get("bars") as Json[]) {
      const voices = bar.get("voices") as Json[];
      const own = voices[voice];
      bar.set("voices", [own && !isEmpty(own) ? own : voices[0]]);
    }
  }
  copy.set("name", name);
  copy.set("shortname", name);
  return copy;
}

/** Whether a voice (in JSON form) has nothing in its bar: no beats, or only empty ones. */
function isEmpty(voice: Json): boolean {
  return ((voice.get("beats") as Json[] | undefined) ?? []).every((beat) => beat.get("isempty") === true);
}

function withoutIds(value: unknown) {
  if (value instanceof Map) {
    value.delete("id");
    value.forEach(withoutIds);
  } else if (Array.isArray(value)) {
    value.forEach(withoutIds);
  }
}

/** Plays `track` on `channel` only. alphaTab would otherwise give it a second channel for effects. */
function playOn(track: Track, channel: number) {
  track.playbackInfo.primaryChannel = channel;
  track.playbackInfo.secondaryChannel = channel;
}

/** Makes a drawn track whose voices play on their own tracks silent, on a channel no part plays on. */
function silence(at: AlphaTabModule, track: Track) {
  playOn(track, DRAWN_CHANNEL);
  track.playbackInfo.volume = 0;
  track.playbackInfo.isMute = true;
  for (const beat of beatsOf(track)) {
    // A volume change in the file would make it heard again.
    beat.automations = beat.automations.filter(({ type }) => type !== at.model.AutomationType.Volume);
  }
}
