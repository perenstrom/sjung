// PROTOTYPE (PER-464): fetch a MusicXML / .mxl file and optionally rewrite its
// lyrics before alphaTab sees it.
// - `hyphens`: alphaTab ignores <syllabic>, so append "-" to every begin/middle
//   syllable ourselves.
// - `orderVerses`: alphaTab numbers verse lines in the order each verse number
//   first appears, not by the number. MuseScore can write verse 1, 3, 2 on a
//   note, which swaps verses 2 and 3 on screen; sort them by number.
// - `shortBars`: alphaTab plays every bar at its full time signature unless
//   the measure says implicit="yes". MuseScore leaves that off for a counted
//   pickup and for bars split around a repeat, so alphaTab pads them with
//   silence (3.5 beats after an eighth-note pickup). Mark them implicit.

import { strFromU8, strToU8, unzipSync } from "fflate";

export type PreparedFile = {
  bytes: Uint8Array;
  /** What the XML says about lyrics, for the prototype's notes. */
  lyrics: { syllables: number; hyphenated: number; extends: number; verses: number; reordered: number };
  /** Measure numbers marked implicit because they are shorter than their time signature. */
  shortBars: string[];
  software: string | null;
  fetchMs: number;
};

export async function prepareFile(
  url: string,
  opts: { hyphens: boolean; orderVerses: boolean; shortBars: boolean }
): Promise<PreparedFile> {
  const t0 = performance.now();
  const raw = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const fetchMs = performance.now() - t0;

  const xml = readXml(raw);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const lyricEls = Array.from(doc.getElementsByTagName("lyric"));
  const verses = new Set(lyricEls.map((l) => l.getAttribute("number") ?? "1"));
  let hyphenated = 0;
  if (opts.hyphens) {
    for (const lyric of lyricEls) {
      const syllabic = lyric.getElementsByTagName("syllabic")[0]?.textContent;
      const text = lyric.getElementsByTagName("text")[0];
      if (text && (syllabic === "begin" || syllabic === "middle")) {
        text.textContent = `${text.textContent ?? ""}-`;
        hyphenated++;
      }
    }
  }
  let reordered = 0;
  if (opts.orderVerses) {
    for (const note of Array.from(doc.getElementsByTagName("note"))) {
      const own = Array.from(note.children).filter((c) => c.tagName === "lyric");
      const sorted = [...own].sort((a, b) => Number(a.getAttribute("number") ?? 1) - Number(b.getAttribute("number") ?? 1));
      if (sorted.some((el, i) => el !== own[i])) {
        reordered++;
        const anchor = own[own.length - 1].nextSibling;
        for (const el of sorted) note.insertBefore(el, anchor);
      }
    }
  }
  const lyrics = {
    reordered,
    syllables: lyricEls.length,
    hyphenated,
    extends: doc.getElementsByTagName("extend").length,
    verses: lyricEls.length ? verses.size : 0,
  };
  const shortBars = opts.shortBars ? markShortBars(doc) : [];
  const software = doc.getElementsByTagName("software")[0]?.textContent ?? null;

  // Unchanged files go to alphaTab exactly as uploaded.
  const changed = hyphenated > 0 || reordered > 0 || shortBars.length > 0;
  const bytes = changed ? strToU8(new XMLSerializer().serializeToString(doc)) : raw;
  return { bytes, lyrics, shortBars, software, fetchMs };
}

/** Finds measures shorter than their time signature (in the first part) and marks them implicit in every part. */
function markShortBars(doc: Document): string[] {
  const parts = Array.from(doc.getElementsByTagName("part"));
  if (!parts.length) return [];
  const child = (el: Element, tag: string) => Array.from(el.children).find((c) => c.tagName === tag);
  const num = (el: Element | undefined) => Number(el?.textContent ?? 0);
  let divisions = 1;
  let beats = 4;
  let beatType = 4;
  const short = new Set<string>();
  for (const measure of Array.from(parts[0].children).filter((c) => c.tagName === "measure")) {
    let pos = 0;
    let end = 0;
    for (const el of Array.from(measure.children)) {
      if (el.tagName === "attributes") {
        const d = child(el, "divisions");
        if (d) divisions = num(d);
        const time = child(el, "time");
        if (time && child(time, "beats")) {
          beats = num(child(time, "beats"));
          beatType = num(child(time, "beat-type"));
        }
      } else if (el.tagName === "note" && !child(el, "chord") && !child(el, "grace")) {
        pos += num(child(el, "duration"));
        // Only notes and rests count: MuseScore uses <forward>/<backup> pairs
        // just to place texts such as "D.S. al Coda" at the end of a bar.
        end = Math.max(end, pos);
      } else if (el.tagName === "backup") {
        pos -= num(child(el, "duration"));
      } else if (el.tagName === "forward") {
        pos += num(child(el, "duration"));
      }
    }
    const quarters = end / divisions;
    const full = (beats * 4) / beatType;
    const n = measure.getAttribute("number");
    if (n && quarters > 0 && quarters < full - 1e-6 && measure.getAttribute("implicit") !== "yes") short.add(n);
  }
  for (const part of parts) {
    for (const measure of Array.from(part.children)) {
      if (measure.tagName === "measure" && short.has(measure.getAttribute("number") ?? "")) {
        measure.setAttribute("implicit", "yes");
      }
    }
  }
  return [...short];
}

function readXml(raw: Uint8Array): string {
  const isZip = raw[0] === 0x50 && raw[1] === 0x4b;
  if (!isZip) return strFromU8(raw);
  const files = unzipSync(raw);
  const container = files["META-INF/container.xml"];
  const root = container ? /full-path="([^"]+)"/.exec(strFromU8(container))?.[1] : undefined;
  const name =
    (root && files[root] ? root : undefined) ??
    Object.keys(files).find((f) => !f.startsWith("META-INF/") && /\.(xml|musicxml)$/i.test(f));
  if (!name) throw new Error("Ingen MusicXML i .mxl-filen");
  return strFromU8(files[name]);
}
