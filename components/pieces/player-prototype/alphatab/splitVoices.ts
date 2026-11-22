// PROTOTYPE (PER-464): give each voice on a shared staff its own mixer part.
//
// alphaTab mixes per Track, and a staff with two voices (Women: S+A) is one
// Track. So after import we add one hidden Track per voice, holding only that
// voice, and keep drawing the original Track (muted). The copy goes through
// alphaTab's own JSON form: clone the track, drop the other voices, strip the
// beat/note ids so new ones are minted, and let jsObjectToScore finish it.

import type { AlphaTab, Score, Settings } from "./engine";

type Obj = Map<string, unknown>;

export type TrackRole =
  | { kind: "plain" } // drawn and heard as is
  | { kind: "display"; voices: number } // drawn, muted; its voices play via hidden tracks
  | { kind: "voice"; of: number; voice: number }; // hidden, heard

export type SplitResult = {
  score: Score;
  roles: TrackRole[];
  /** Tracks to draw: the original ones. */
  display: number[];
  channels: { track: number; channel: number }[];
  warnings: string[];
};

const CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];

export function usedVoices(score: Score, trackIndex: number): number[] {
  const track = score.tracks[trackIndex];
  if (track.staves.length !== 1) return [0];
  const used = new Set<number>();
  for (const bar of track.staves[0].bars) {
    bar.voices.forEach((voice, v) => {
      if (voice.beats.some((b) => b.notes.length > 0)) used.add(v);
    });
  }
  return [...used].sort((a, b) => a - b);
}

export function splitVoices(at: AlphaTab, score: Score, settings: Settings): SplitResult {
  const warnings: string[] = [];
  const original = score.tracks.length;
  const js = at.model.JsonConverter.scoreToJsObject(score) as Obj;
  const tracks = js.get("tracks") as Obj[];
  const roles: TrackRole[] = score.tracks.map(() => ({ kind: "plain" }));

  for (let ti = 0; ti < original; ti++) {
    const voices = usedVoices(score, ti);
    if (voices.length < 2) continue;
    roles[ti] = { kind: "display", voices: voices.length };
    const name = score.tracks[ti].name || `Stämma ${ti + 1}`;
    voices.forEach((v, k) => {
      const clone = structuredClone(tracks[ti]);
      stripIds(clone);
      for (const staff of clone.get("staves") as Obj[]) {
        for (const bar of staff.get("bars") as Obj[]) {
          const barVoices = bar.get("voices") as Obj[];
          const mine = barVoices[v];
          bar.set("voices", [mine && hasNotes(mine) ? mine : asRests(barVoices[0])]);
        }
      }
      clone.set("name", `${name} ${k + 1}`);
      clone.set("shortname", `${score.tracks[ti].shortName || name} ${k + 1}`);
      tracks.push(clone);
      roles.push({ kind: "voice", of: ti, voice: v });
    });
  }

  // Channels: every heard track gets its own (primary = secondary, to save
  // channels); all muted display tracks share one.
  const channels: SplitResult["channels"] = [];
  const free = [...CHANNELS];
  const heard = roles.map((r, i) => (r.kind === "display" ? -1 : i)).filter((i) => i >= 0);
  const mutedChannel = roles.some((r) => r.kind === "display") ? free.pop() : undefined;
  for (const i of heard) {
    const ch = free.shift();
    if (ch === undefined) {
      warnings.push(`Slut på MIDI-kanaler: ${trackName(tracks[i])} delar kanal med en annan stämma`);
    }
    setChannel(tracks[i], ch ?? 15);
    channels.push({ track: i, channel: ch ?? 15 });
  }
  roles.forEach((r, i) => {
    if (r.kind !== "display" || mutedChannel === undefined) return;
    setChannel(tracks[i], mutedChannel);
    channels.push({ track: i, channel: mutedChannel });
  });

  const next = at.model.JsonConverter.jsObjectToScore(js, settings);
  return { score: next, roles, display: Array.from({ length: original }, (_, i) => i), channels, warnings };
}

function hasNotes(voice: Obj): boolean {
  return ((voice.get("beats") as Obj[] | undefined) ?? []).some(
    (b) => ((b.get("notes") as unknown[] | undefined) ?? []).length > 0
  );
}

/** Voice 1's rhythm with every note taken out: keeps the bar's length. */
function asRests(voice: Obj): Obj {
  const copy = structuredClone(voice);
  for (const beat of (copy.get("beats") as Obj[] | undefined) ?? []) {
    beat.set("notes", []);
    beat.delete("lyrics");
  }
  return copy;
}

function stripIds(value: unknown) {
  if (value instanceof Map) {
    value.delete("id");
    value.forEach((v) => stripIds(v));
  } else if (Array.isArray(value)) {
    value.forEach(stripIds);
  }
}

function setChannel(track: Obj, channel: number) {
  const info = track.get("playbackinfo") as Obj;
  info.set("primarychannel", channel);
  info.set("secondarychannel", channel);
}

function trackName(track: Obj): string {
  return String(track.get("name") ?? "?");
}
