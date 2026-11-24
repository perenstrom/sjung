// @vitest-environment jsdom
// The fix-ups edit the MusicXML with the browser's DOMParser, which Node lacks.
import * as alphaTab from "@coderline/alphatab";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { playWith, scoreOf } from "@/lib/player/musicxml-score";
import { TICKS_PER_QUARTER } from "@/lib/player/notation-bars";
import { SOUND_PROGRAMS } from "@/lib/player/soundfont";

/** A one-part MusicXML score in 4/4, a quarter note one division, with `measures` as written. */
function musicXml(measures: string[], { program = 1 } = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Sopran</part-name>
      <midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>${program}</midi-program></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">${measures
    .map((content, index) => `<measure number="${index + 1}">${index === 0 ? ATTRIBUTES : ""}${content}</measure>`)
    .join("")}</part>
</score-partwise>`;
}

const ATTRIBUTES =
  "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>";

function note(quarters: number, lyrics = "") {
  const type = { 1: "quarter", 2: "half", 4: "whole" }[quarters];
  return `<note><pitch><step>C</step><octave>5</octave></pitch><duration>${quarters}</duration><type>${type}</type>${lyrics}</note>`;
}

function lyric(number: number | string, text: string, syllabic = "single") {
  return `<lyric number="${number}"><syllabic>${syllabic}</syllabic><text>${text}</text></lyric>`;
}

function direction(sound: string, mark = "") {
  return `<direction placement="above"><direction-type>${mark || "<words>x</words>"}</direction-type><sound ${sound}/></direction>`;
}

function load(xml: string | Uint8Array) {
  return scoreOf(alphaTab, typeof xml === "string" ? strToU8(xml) : xml, new alphaTab.Settings());
}

/** The MIDI alphaTab plays for `score`, and the bars it plays, in order. */
function played(score: alphaTab.model.Score) {
  const midi = new alphaTab.midi.MidiFile();
  const generator = new alphaTab.midi.MidiFileGenerator(
    score,
    new alphaTab.Settings(),
    new alphaTab.midi.AlphaSynthMidiFileHandler(midi),
  );
  generator.generate();
  return { midi, bars: generator.tickLookup.masterBars };
}

function lyricsOf(score: alphaTab.model.Score) {
  return score.tracks[0].staves[0].bars.flatMap((bar) => bar.voices[0].beats.map((beat) => beat.lyrics ?? []));
}

describe("scoreOf", () => {
  it.each([
    // MuseScore places "D.S. al Coda" at the end of a bar with a <forward>, then backs up.
    {
      bar: "a pickup with a text placed at its end",
      measure: `${note(1)}<forward><duration>3</duration></forward><backup><duration>3</duration></backup>`,
      quarters: 1,
    },
    {
      bar: "a full bar ending in a hidden rest",
      measure: `${note(1)}<forward><duration>3</duration></forward>`,
      quarters: 4,
    },
  ])("plays $bar as long as its notes and rests", ({ measure, quarters }) => {
    const score = load(musicXml([measure, note(4)]));

    expect(played(score).bars.map(({ start, end }) => (end - start) / TICKS_PER_QUARTER)).toEqual([quarters, 4]);
  });

  it.each([
    { numbers: [1, 3, 2] },
    // Finale numbers its verses per part.
    { numbers: ["part1verse1", "part1verse3", "part1verse2"] },
  ])("orders each note's verses by number, numbered $numbers", ({ numbers }) => {
    const verses = ["ett", "tre", "två"].map((text, index) => lyric(numbers[index], text)).join("");
    const score = load(musicXml([note(4, verses)]));

    expect(lyricsOf(score)).toEqual([["ett", "två", "tre"]]);
  });

  it("ends each syllable that goes on to the next note with a hyphen", () => {
    const syllables = [lyric(1, "Hal", "begin"), lyric(1, "le", "middle"), lyric(1, "lu", "end"), lyric(1, "ja")];
    const score = load(musicXml([syllables.map((text) => note(1, text)).join("")]));

    expect(lyricsOf(score)).toEqual([["Hal-"], ["le-"], ["lu"], ["ja"]]);
  });

  it("reads the score from an .mxl file", () => {
    const container = `<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>`;
    const mxl = zipSync({
      "META-INF/container.xml": strToU8(container),
      "score.musicxml": strToU8(musicXml([note(4, lyric(1, "Hal", "begin"))])),
    });

    expect(lyricsOf(load(mxl))).toEqual([["Hal-"]]);
  });

  it.each([
    {
      jump: "D.S.",
      target: "To Coda",
      measures: [
        direction('segno="s"', "<segno/>") + note(4),
        direction('tocoda="c"', "<words>To Coda</words>") + note(4),
        note(4) + direction('dalsegno="s"', "<words>D.S. al Coda</words>"),
        direction('coda="c"', "<coda/>") + note(4),
      ],
      order: [1, 2, 3, 1, 2, 4],
    },
    {
      jump: "D.C.",
      target: "Fine",
      measures: [
        note(4),
        note(4) + direction('fine="yes"', "<words>Fine</words>"),
        note(4) + direction('dacapo="yes"', "<words>D.C. al Fine</words>"),
      ],
      order: [1, 2, 3, 1, 2],
    },
  ])("takes a $jump to the $target", ({ measures, order }) => {
    const score = load(musicXml(measures));

    expect(played(score).bars.map(({ masterBar }) => masterBar.index + 1)).toEqual(order);
  });
});

describe("playWith", () => {
  it("plays every part with the program, over the instrument the file starts with", () => {
    const score = load(musicXml([note(4)], { program: 1 }));

    playWith(alphaTab, score, SOUND_PROGRAMS.choir);

    const programs = played(score)
      .midi.events.filter((event) => event.type === alphaTab.midi.MidiEventType.ProgramChange)
      .map((event) => (event as alphaTab.midi.ProgramChangeEvent).program);
    expect(new Set(programs)).toEqual(new Set([SOUND_PROGRAMS.choir]));
  });
});
