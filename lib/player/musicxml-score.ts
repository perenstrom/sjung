import type * as AlphaTab from "@coderline/alphatab";
import { unzipSync } from "fflate";

export type AlphaTabModule = typeof AlphaTab;
type Score = AlphaTab.model.Score;

/**
 * The score in a MusicXML or `.mxl` file, adjusted where alphaTab's import
 * gets real choir scores wrong (ADR-0010). The file itself is never changed.
 *
 * Before the import, in the MusicXML: bars shorter than their time signature
 * are marked as such, each note's verses are sorted by number, and each
 * syllable that goes on to the next note ends with a hyphen. After it, a
 * D.S. or D.C. takes the score's To Coda or stops at its Fine.
 *
 * Needs the browser's `DOMParser`. A file that isn't readable MusicXML goes
 * to alphaTab as it is, to fail there.
 */
export function scoreOf(at: AlphaTabModule, file: Uint8Array, settings: AlphaTab.Settings): Score {
  const score = at.importer.ScoreLoader.loadScoreFromBytes(fixedUpMusicXml(file) ?? file, settings);
  takeJumps(at, score);
  return score;
}

/** The MusicXML in `file`, fixed up, as UTF-8, or `null` if it can't be read. */
function fixedUpMusicXml(file: Uint8Array): Uint8Array | null {
  const xml = musicXmlIn(file);
  if (xml === null) return null;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  markShortBars(doc);
  sortVerses(doc);
  hyphenate(doc);
  return new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
}

/** The MusicXML text of a MusicXML file, or of the score an `.mxl` (zip) file holds. */
function musicXmlIn(file: Uint8Array): string | null {
  if (!isZip(file)) return new TextDecoder().decode(file);
  try {
    const files = unzipSync(file);
    const container = files["META-INF/container.xml"];
    const root = container && /full-path=["']([^"']+)["']/.exec(new TextDecoder().decode(container))?.[1];
    const name =
      (root && files[root] ? root : undefined) ??
      Object.keys(files).find((path) => !path.startsWith("META-INF/") && /\.(xml|musicxml)$/i.test(path));
    return name ? new TextDecoder().decode(files[name]) : null;
  } catch {
    return null;
  }
}

/** Whether `file` starts like a zip file ("PK"), as an `.mxl` file does. */
function isZip(file: Uint8Array): boolean {
  return file[0] === 0x50 && file[1] === 0x4b;
}

function children(element: Element, tag: string): Element[] {
  return Array.from(element.children).filter((child) => child.tagName === tag);
}

function numberIn(element: Element, tag: string): number | null {
  const child = children(element, tag)[0];
  return child ? Number(child.textContent) : null;
}

/**
 * Marks bars shorter than their time signature `implicit`, which alphaTab
 * otherwise pads with silence: a counted pickup, or a bar split around a
 * repeat, which MuseScore leaves unmarked. The first part decides, for every
 * part. Only notes and rests count, and a `<forward>` that is backed up from
 * again doesn't, since MuseScore places a text such as "D.S. al Coda" at the
 * end of a bar that way.
 */
function markShortBars(doc: Document) {
  const parts = Array.from(doc.getElementsByTagName("part"));
  if (parts.length === 0) return;
  let divisions = 1;
  let time = { beats: 4, beatType: 4 };
  const short = children(parts[0], "measure").map((measure) => {
    let position = 0;
    let end = 0;
    /** How far a `<forward>` reaches, until a `<backup>` takes it back. */
    let forwardEnd = 0;
    for (const element of Array.from(measure.children)) {
      if (element.tagName === "attributes") {
        divisions = numberIn(element, "divisions") ?? divisions;
        time = timeIn(element) ?? time;
      } else if (element.tagName === "note") {
        if (children(element, "chord").length > 0 || children(element, "grace").length > 0) continue;
        position += numberIn(element, "duration") ?? 0;
        end = Math.max(end, position);
      } else if (element.tagName === "forward") {
        position += numberIn(element, "duration") ?? 0;
        forwardEnd = Math.max(forwardEnd, position);
      } else if (element.tagName === "backup") {
        position -= numberIn(element, "duration") ?? 0;
        forwardEnd = 0;
      }
    }
    end = Math.max(end, forwardEnd);
    // end / divisions quarters against beats * 4 / beatType, without fractions.
    return end > 0 && end * time.beatType < time.beats * 4 * divisions;
  });
  for (const part of parts) {
    children(part, "measure").forEach((measure, index) => {
      if (short[index]) measure.setAttribute("implicit", "yes");
    });
  }
}

/** The time signature `attributes` sets, a composite one such as 3+2 added up, or `null` if none. */
function timeIn(attributes: Element): { beats: number; beatType: number } | null {
  const time = children(attributes, "time")[0];
  const beatsText = time && children(time, "beats")[0]?.textContent;
  const beatType = time && numberIn(time, "beat-type");
  if (!beatsText || !beatType) return null;
  const beats = beatsText.split("+").reduce((sum, part) => sum + Number(part), 0);
  return Number.isFinite(beats) && beats > 0 ? { beats, beatType } : null;
}

/**
 * Sorts each note's verses by number. alphaTab puts them on lines in the
 * order they come, and MuseScore can write verse 1, 3, 2.
 */
function sortVerses(doc: Document) {
  for (const note of Array.from(doc.getElementsByTagName("note"))) {
    const lyrics = children(note, "lyric");
    if (lyrics.length < 2) continue;
    // Verse "part1verse3" (as Finale numbers them) is verse 3.
    const verse = (lyric: Element) => Number(/\d+$/.exec(lyric.getAttribute("number") ?? "")?.[0] ?? 1);
    const after = lyrics[lyrics.length - 1].nextSibling;
    for (const lyric of [...lyrics].sort((a, b) => verse(a) - verse(b))) note.insertBefore(lyric, after);
  }
}

/** Ends each syllable that goes on to the next note with a hyphen, which alphaTab doesn't draw itself. */
function hyphenate(doc: Document) {
  for (const lyric of Array.from(doc.getElementsByTagName("lyric"))) {
    const syllabic = children(lyric, "syllabic").at(-1)?.textContent;
    const text = children(lyric, "text").at(-1);
    if (text && (syllabic === "begin" || syllabic === "middle")) text.textContent = `${text.textContent ?? ""}-`;
  }
}

/**
 * alphaTab reads every D.S. and D.C. as plain, so it never takes a To Coda
 * and never stops at Fine. Makes them "al Coda" when the score has a To Coda,
 * or else "al Fine" when it has a Fine.
 */
function takeJumps(at: AlphaTabModule, score: Score) {
  const { Direction } = at.model;
  const scoreHas = (direction: AlphaTab.model.Direction) =>
    score.masterBars.some((bar) => bar.directions?.has(direction));
  const jumps = scoreHas(Direction.JumpDaCoda)
    ? [
        [Direction.JumpDalSegno, Direction.JumpDalSegnoAlCoda],
        [Direction.JumpDaCapo, Direction.JumpDaCapoAlCoda],
      ]
    : scoreHas(Direction.TargetFine)
      ? [
          [Direction.JumpDalSegno, Direction.JumpDalSegnoAlFine],
          [Direction.JumpDaCapo, Direction.JumpDaCapoAlFine],
        ]
      : [];
  for (const bar of score.masterBars) {
    for (const [plain, withTarget] of jumps) {
      if (bar.directions?.delete(plain)) bar.addDirection(withTarget);
    }
  }
}

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
    for (const beat of beatsOf(track)) {
      for (const automation of beat.automations) {
        if (automation.type === at.model.AutomationType.Instrument) automation.value = program;
      }
    }
  }
}

/** Every beat of `track`, in every staff, bar and voice. */
export function beatsOf(track: AlphaTab.model.Track): AlphaTab.model.Beat[] {
  return track.staves.flatMap((staff) => staff.bars.flatMap((bar) => bar.voices.flatMap((voice) => voice.beats)));
}
