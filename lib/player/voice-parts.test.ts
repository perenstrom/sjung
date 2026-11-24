// @vitest-environment jsdom
// The score is read through `scoreOf`, which needs the browser's DOMParser.
import * as alphaTab from "@coderline/alphatab";
import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";

import { scoreOf } from "@/lib/player/musicxml-score";
import { voicePartsOf } from "@/lib/player/voice-parts";

/** A note one whole bar long, at MIDI key `key`, in `voice` of its staff. */
type Note = { key: number; voice: number };

/**
 * A MusicXML score in 4/4 with one staff per entry of `staves`, each with
 * bars of notes in one or more voices.
 */
function musicXml(staves: { name: string; bars: Note[][] }[]): string {
  const parts = staves.map((_, index) => `P${index + 1}`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>${staves
    .map(({ name }, index) => `<score-part id="${parts[index]}"><part-name>${name}</part-name></score-part>`)
    .join("")}</part-list>
  ${staves
    .map(
      ({ bars }, index) =>
        `<part id="${parts[index]}">${bars
          .map(
            (notes, bar) =>
              `<measure number="${bar + 1}">${bar === 0 ? ATTRIBUTES : ""}${notes
                .map(note)
                .join("<backup><duration>4</duration></backup>")}</measure>`,
          )
          .join("")}</part>`,
    )
    .join("")}
</score-partwise>`;
}

const ATTRIBUTES =
  "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>";

const STEPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function note({ key, voice }: Note) {
  const [step, alter] = STEPS[key % 12].split("");
  const pitch = `<step>${step}</step>${alter ? "<alter>1</alter>" : ""}<octave>${Math.floor(key / 12) - 1}</octave>`;
  return `<note><pitch>${pitch}</pitch><duration>4</duration><voice>${voice}</voice><type>whole</type></note>`;
}

/** A staff with two voices for `bars` bars: `upper` over `lower`. */
function twoVoices(name: string, upper: number, lower: number, bars = 1) {
  return {
    name,
    bars: Array.from({ length: bars }, () => [
      { key: upper, voice: 1 },
      { key: lower, voice: 2 },
    ]),
  };
}

function load(staves: { name: string; bars: Note[][] }[]) {
  const settings = new alphaTab.Settings();
  return voicePartsOf(alphaTab, scoreOf(alphaTab, strToU8(musicXml(staves)), settings), settings);
}

/** The MIDI events alphaTab plays for `score`. */
function played(score: alphaTab.model.Score) {
  const midi = new alphaTab.midi.MidiFile();
  new alphaTab.midi.MidiFileGenerator(
    score,
    new alphaTab.Settings(),
    new alphaTab.midi.AlphaSynthMidiFileHandler(midi),
  ).generate();
  return midi.events;
}

/** The keys played on each channel that is heard: not set to volume 0. */
function heardKeysByChannel(score: alphaTab.model.Score) {
  const events = played(score);
  const silent = new Set(
    events
      .filter(
        (event): event is alphaTab.midi.ControlChangeEvent =>
          event.type === alphaTab.midi.MidiEventType.ControlChange &&
          (event as alphaTab.midi.ControlChangeEvent).controller === alphaTab.midi.ControllerType.VolumeCoarse &&
          (event as alphaTab.midi.ControlChangeEvent).value === 0,
      )
      .map(({ channel }) => channel),
  );
  const keys = new Map<number, number[]>();
  for (const event of events) {
    if (event.type !== alphaTab.midi.MidiEventType.NoteOn) continue;
    const { channel, noteKey } = event as alphaTab.midi.NoteOnEvent;
    if (!silent.has(channel)) keys.set(channel, [...(keys.get(channel) ?? []), noteKey]);
  }
  return keys;
}

/** The keys each part plays, by part name, and `others` for keys heard on no part's channel. */
function keysByPart(staves: { name: string; bars: Note[][] }[]): Record<string, number[] | undefined> {
  const { score, parts } = load(staves);
  const keys = heardKeysByChannel(score);
  const channels = parts.map(({ track }) => score.tracks[track].playbackInfo.primaryChannel);
  const others = [...keys].filter(([channel]) => !channels.includes(channel)).flatMap(([, played]) => played);
  return {
    ...Object.fromEntries(parts.map(({ name }, index) => [name, keys.get(channels[index])])),
    ...(others.length > 0 && { others }),
  };
}

describe("voicePartsOf", () => {
  it("gives each voice on a shared staff a part of its own, the upper voice first, and silences the drawn staff", () => {
    expect(keysByPart([twoVoices("Women", 76, 72), twoVoices("Men", 55, 48)])).toEqual({
      "Women 1": [76],
      "Women 2": [72],
      "Men 1": [55],
      "Men 2": [48],
    });
  });

  it("keeps a staff with one voice as one part, under its own name", () => {
    expect(keysByPart([{ name: "Sopran", bars: [[{ key: 72, voice: 1 }]] }, twoVoices("Men", 55, 48)])).toEqual({
      Sopran: [72],
      "Men 1": [55],
      "Men 2": [48],
    });
  });

  it("plays the upper voice in both parts where the lower one has nothing, as in unison", () => {
    const women = {
      name: "Women",
      bars: [
        [
          { key: 76, voice: 1 },
          { key: 72, voice: 2 },
        ],
        [{ key: 74, voice: 1 }],
      ],
    };

    expect(keysByPart([women])).toEqual({ "Women 1": [76, 74], "Women 2": [72, 74] });
  });

  it("draws only the staves of the file", () => {
    const { drawn } = load([twoVoices("Women", 76, 72), { name: "Piano", bars: [[{ key: 60, voice: 1 }]] }]);

    expect(drawn).toEqual([0, 1]);
  });

  it("splits staves in order only while the score has at most 14 parts, one MIDI channel each", () => {
    // alphaTab reads a space in a part's name as a no-break space, so these have none.
    const staves = Array.from({ length: 8 }, (_, index) => twoVoices(`Staff${index + 1}`, 72 + index, 60 + index));

    const keys = keysByPart(staves);

    expect(Object.keys(keys)).toHaveLength(14);
    // Each split part plays its own voice alone, so no two share a channel.
    expect(keys).toMatchObject({ "Staff6 1": [77], "Staff6 2": [65] });
    expect(Object.keys(keys).slice(-2)).toEqual(["Staff7", "Staff8"]);
    expect(keys.Staff8?.toSorted()).toEqual([67, 79]);
  });
});
