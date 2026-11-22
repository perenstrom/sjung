// PROTOTYPE (PER-458): stub Playable Files modelled on the real test files on
// the map PER-443. The notation files play for real through alphaTab; for audio
// and MIDI nothing is read, the fields only drive the fake player.

export type PartKind = "voice" | "instrument" | "percussion";

export type Part = {
  id: string;
  /** What the mixer shows: taken from the file's track/part name. */
  label: string;
  kind: PartKind;
  /** The staff the part is drawn on; parts sharing one are voices on a staff. */
  staff?: string;
};

export type PlayableFixture = {
  key: string;
  fileName: string;
  format: "audio" | "midi" | "musicxml" | "mscz";
  /** Whether a following score can be shown (MIDI and audio have none). */
  hasScore: boolean;
  bpm: number;
  beatsPerBar: number;
  bars: number;
  verses: number;
  parts: Part[];
  /** What this file exercises, shown in the prototype's own notes. */
  note: string;
  /** The real file under /public, played through alphaTab (PER-464). */
  url?: string;
};

const satb = (staffs?: [string, string]): Part[] => [
  { id: "s", label: "Sopran", kind: "voice", staff: staffs?.[0] ?? "Sopran" },
  { id: "a", label: "Alt", kind: "voice", staff: staffs?.[0] ?? "Alt" },
  { id: "t", label: "Tenor", kind: "voice", staff: staffs?.[1] ?? "Tenor" },
  { id: "b", label: "Bas", kind: "voice", staff: staffs?.[1] ?? "Bas" },
];

export const FIXTURES: PlayableFixture[] = [
  {
    key: "audio",
    fileName: "Sopran 1 – övningsfil.mp3",
    format: "audio",
    hasScore: false,
    bpm: 80,
    beatsPerBar: 4,
    bars: 52,
    verses: 0,
    parts: [],
    note: "One audio File: no mixer, no score. What a singer who only has an mp3 today gets.",
  },
  {
    key: "julklockorna",
    fileName: "Julklockorna.xml",
    format: "musicxml",
    hasScore: true,
    bpm: 72,
    beatsPerBar: 4,
    bars: 11,
    verses: 0,
    parts: satb(),
    note: "MusicXML from Sibelius: SATB, one part per voice, a repeat with two voltas, no lyrics.",
    url: "/prototype-player/files/julklockorna.xml",
  },
  {
    key: "ris",
    fileName: "Ris a la Malta.mid",
    format: "midi",
    hasScore: false,
    bpm: 80,
    beatsPerBar: 4,
    bars: 40,
    verses: 0,
    parts: [
      { id: "s1", label: "S1", kind: "voice" },
      { id: "s2", label: "S2", kind: "voice" },
      { id: "a", label: "A", kind: "voice" },
      { id: "t", label: "T", kind: "voice" },
      { id: "b", label: "B", kind: "voice" },
      { id: "perc", label: "Shaker", kind: "percussion" },
    ],
    note: "MIDI: five parts named S1, S2, A, T, B plus a shaker on the drum channel. No score.",
  },
  {
    key: "staffan",
    fileName: "Sankt Staffan Staffansvisa från Skåne (Kjellberg).mscz",
    format: "mscz",
    hasScore: true,
    bpm: 96,
    beatsPerBar: 3,
    bars: 49,
    verses: 3,
    parts: satb(),
    note: "MuseScore: SATB on four staves, 49 bars, three verses of lyrics (shown without hyphens).",
    // Exported with MuseScore 4.7.7's CLI; it needed -f (the score is flagged as corrupted).
    url: "/prototype-player/files/staffan.mxl",
  },
  {
    key: "test-mxl",
    fileName: "Test Score.mxl",
    format: "musicxml",
    hasScore: true,
    bpm: 120,
    beatsPerBar: 4,
    bars: 2,
    verses: 0,
    parts: satb(["Women", "Men"]),
    note: "Two voices per staff: Women (S+A) and Men (T+B) drawn as two staves, mixed as four voices.",
    url: "/prototype-player/files/test-score.mxl",
  },
];

export function findFixture(key: string | undefined): PlayableFixture {
  return FIXTURES.find((f) => f.key === key) ?? FIXTURES[1];
}

export const FORMAT_LABEL: Record<PlayableFixture["format"], string> = {
  audio: "Ljud",
  midi: "MIDI",
  musicxml: "Noter",
  mscz: "MuseScore",
};
