import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PlayerEngine } from "@/lib/file-formats";
import { IDLE_SNAPSHOT, type Loop, type PlayerSnapshot } from "@/lib/player/player";
import { renderMarkup, textOf } from "@/lib/testing/markup";

import { RepeatControls, TempoControls } from "./controls";
import { PlayerScreen } from "./PlayerView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const files = [
  { id: "alt", displayName: "Alt", formatLabel: "MP3", href: "/play/alt" },
  { id: "sopran", displayName: "Sopran", formatLabel: "WAV", href: "/play/sopran" },
];

function renderScreen(
  snapshot: Partial<PlayerSnapshot> = {},
  peaks: readonly number[] | null = null,
  engine: PlayerEngine = "audio"
) {
  return renderMarkup(
    createElement(PlayerScreen, {
      pieceName: "Vem kan segla",
      file: { ...files[1], engine },
      files,
      snapshot: { ...IDLE_SNAPSHOT, status: "ready", duration: 120, ...snapshot },
      closeHref: "/app/koren/setlists/sl-1",
      player: null,
      peaks,
    })
  );
}

/** The markup of the desktop layout's transport row. */
function desktopTransport(html: string) {
  return html.match(/<footer[^>]*data-layout="desktop"[^>]*>.*?<\/footer>/)?.[0] ?? "";
}

describe("PlayerScreen", () => {
  it("heads the player with a way back to where it was opened, the Piece's name, the Playable Files there and the format", () => {
    const html = renderScreen();

    const close = html.match(/<a[^>]*aria-label="Stäng spelaren"[^>]*>/)?.[0];
    expect(close).toContain('href="/app/koren/setlists/sl-1"');
    expect(textOf(html)).toContain("Vem kan segla");
    expect([...html.matchAll(/<option[^>]*>(.*?)<\/option>/g)].map(([, name]) => name)).toEqual(["Alt", "Sopran"]);
    expect(html).toMatch(/<option[^>]*value="sopran"[^>]*selected/);
    expect(textOf(html)).toContain("WAV");
  });

  it("shows an audio File's name and that it has no score", () => {
    expect(renderScreen()).toMatch(/<\/header>.*>Sopran<.*>Ljudfil – inga noter att visa\.</);
  });

  it("says when the File can't be played", () => {
    expect(textOf(renderScreen({ status: "error" }))).toContain("Filen kunde inte spelas upp.");
  });

  it("docks the playhead and length, the tempo, Repetera and Play", () => {
    const text = textOf(renderScreen({ position: 12, tempo: 75 }));

    expect(text).toContain("0:12");
    expect(text).toContain("2:00");
    expect(text).toMatch(/75 %.*Repetera/);
    expect(renderScreen()).toContain('aria-label="Spela"');
    expect(renderScreen({ playing: true })).toContain('aria-label="Pausa"');
  });
});

describe("PlayerScreen for a MIDI File", () => {
  /** Bars of two seconds each: bar 16 starts at 30 s. */
  const bars = Array.from({ length: 60 }, (_, index) => index * 2);

  it("shows the File's name and that it has no score", () => {
    expect(renderScreen({}, null, "midi")).toMatch(/<\/header>.*>Sopran<.*>MIDI-fil – inga noter att visa\.</);
  });

  it("shows the bar at the playhead next to the time, on the phone and on desktop", () => {
    const html = renderScreen({ bars, position: 31 }, null, "midi");

    expect(textOf(html.match(/<footer[^>]*md:hidden[^>]*>.*?<\/footer>/)?.[0] ?? "")).toMatch(/0:31 · takt 16.*2:00/);
    expect(textOf(desktopTransport(html))).toMatch(/0:31\s*takt 16.*2:00/);
  });

  it("draws a plain strip to seek in on desktop, not a waveform", () => {
    const html = renderScreen({ bars, position: 60, loop: { start: 30, end: 90 } }, null, "midi");

    expect(html).not.toContain("data-waveform");
    expect(html).toMatch(/data-strip[^>]*>.*?data-passage[^>]*style="left:25%;width:50%"/);
    expect(html).toMatch(/data-played[^>]*style="width:50%"/);
  });
});

describe("PlayerScreen on desktop", () => {
  it("has a keyboard-shortcuts button in the header", () => {
    expect(renderScreen().match(/<header.*<\/header>/)?.[0]).toContain('aria-label="Kortkommandon"');
  });

  it("puts Play, the time, the seek bar, the length, Tempo and Repetera in one transport row", () => {
    const row = desktopTransport(renderScreen({ position: 12, tempo: 75 }));

    expect(row).toMatch(/aria-label="Spela".*0:12.*aria-label="Position".*2:00/);
    expect(textOf(row)).toMatch(/0:12.*2:00.*75 %.*Repetera$/);
  });

  it("shows the passage on Repetera once it is set", () => {
    expect(textOf(desktopTransport(renderScreen({ loop: { start: 12, end: 30 } })))).toMatch(/0:12–0:30$/);
    expect(textOf(desktopTransport(renderScreen({ loop: { start: 12, end: null } })))).toMatch(/Repetera$/);
  });

  it("draws the audio File as a waveform strip, played up to the playhead, with the passage shaded", () => {
    const html = renderScreen({ position: 60, loop: { start: 30, end: 90 } }, [0.5, 1, 0.25, 0.75]);
    const strip = html.match(/<div[^>]*data-waveform[^>]*>.*?<\/div><\/div>/)?.[0] ?? html;
    const bars = [...strip.matchAll(/data-bar="(played|ahead)"[^>]*style="height:(\d+)%"/g)].map(([, state, height]) => [
      state,
      Number(height),
    ]);

    expect(bars).toEqual([
      ["played", 50],
      ["played", 100],
      ["ahead", 25],
      ["ahead", 75],
    ]);
    expect(strip).toMatch(/data-passage[^>]*style="left:25%;width:50%"/);
  });
});

describe("TempoControls", () => {
  it("offers 60, 75, 90 and 100 % next to the slider", () => {
    const html = renderMarkup(createElement(TempoControls, { tempo: 90, onTempo: () => {} }));

    expect([...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map(([, label]) => textOf(label))).toEqual([
      "60 %",
      "75 %",
      "90 %",
      "100 %",
    ]);
    expect(html).toMatch(/<input[^>]*type="range"[^>]*min="50"[^>]*max="120"/);
  });
});

describe("RepeatControls", () => {
  it.each<{ loop: Loop | null; expected: string }>([
    { loop: null, expected: "Sätt start och slut för att repetera ett avsnitt. Start här" },
    { loop: { start: 12, end: null }, expected: "Start 0:12. Sätt slutet där avsnittet slutar. Slut här Sluta repetera" },
    { loop: { start: 12, end: 30 }, expected: "Repeterar 0:12–0:30 Start här Sluta repetera" },
  ])("with passage $loop shows: $expected", ({ loop, expected }) => {
    const html = renderMarkup(createElement(RepeatControls, { loop, onMark: () => {}, onStop: () => {} }));
    const shown = [...html.matchAll(/<(?:p|button)[^>]*>(.*?)<\/(?:p|button)>/g)].map(([, text]) => textOf(text));

    expect(shown.join(" ")).toBe(expected);
  });
});
