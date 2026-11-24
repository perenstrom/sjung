import type * as AlphaTab from "@coderline/alphatab";

type AlphaTabModule = typeof AlphaTab;
type Score = AlphaTab.model.Score;

/** Whether every staff of `track` is percussion, so it plays drums and keeps its own sounds. */
export function isPercussion(track: AlphaTab.model.Track): boolean {
  return track.staves.every((staff) => staff.isPercussion);
}

/**
 * Plays every track but percussion with `program`, so the file's own
 * instruments don't pick sounds the trimmed soundfont doesn't have. The
 * MusicXML import also puts an instrument change on each track's first beat,
 * which would override the track's program, so those change too.
 */
export function playWith(at: AlphaTabModule, score: Score, program: number) {
  for (const track of score.tracks) {
    if (isPercussion(track)) continue;
    track.playbackInfo.program = program;
    for (const beat of track.staves.flatMap((staff) =>
      staff.bars.flatMap((bar) => bar.voices.flatMap((voice) => voice.beats)),
    )) {
      for (const automation of beat.automations) {
        if (automation.type === at.model.AutomationType.Instrument) automation.value = program;
      }
    }
  }
}
