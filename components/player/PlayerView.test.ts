import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { IDLE_SNAPSHOT, type Loop, type PlayerSnapshot } from "@/lib/player/player";
import { pieceHref } from "@/lib/pieces/href";
import { renderMarkup, textOf } from "@/lib/testing/markup";

import { RepeatControls, TempoControls } from "./controls";
import { PlayerScreen } from "./PlayerView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const files = [
  { id: "alt", displayName: "Alt", formatLabel: "MP3" },
  { id: "sopran", displayName: "Sopran", formatLabel: "WAV" },
];

function renderScreen(snapshot: Partial<PlayerSnapshot> = {}) {
  return renderMarkup(
    createElement(PlayerScreen, {
      groupSlug: "koren",
      pieceId: "piece-1",
      pieceName: "Vem kan segla",
      file: files[1],
      files,
      snapshot: { ...IDLE_SNAPSHOT, status: "ready", duration: 120, ...snapshot },
      player: null,
    })
  );
}

describe("PlayerScreen", () => {
  it("heads the player with a way back to the Piece, its name, the Piece's Playable Files and the format", () => {
    const html = renderScreen();

    const close = html.match(/<a[^>]*aria-label="Stäng spelaren"[^>]*>/)?.[0];
    expect(close).toContain(`href="${pieceHref("koren", "piece-1")}"`);
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
