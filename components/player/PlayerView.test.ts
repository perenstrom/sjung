import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PlayerEngine } from "@/lib/file-formats";
import { IDLE_SNAPSHOT, type PlayerSnapshot } from "@/lib/player/player";
import { controlsView } from "@/lib/player/player-controls";
import { part } from "@/lib/testing/player";
import { renderMarkup, textOf } from "@/lib/testing/markup";

import { PartsControls, TempoControls } from "./controls";
import { PlayerScreen } from "./PlayerView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const files = [
  { id: "alt", displayName: "Alt", formatLabel: "MP3", href: "/play/alt" },
  { id: "sopran", displayName: "Sopran", formatLabel: "WAV", href: "/play/sopran" },
];

function renderScreen(
  snapshot: Partial<PlayerSnapshot> = {},
  peaks: readonly number[] | null = null,
  engine: PlayerEngine = "audio",
) {
  return renderMarkup(
    createElement(PlayerScreen, {
      pieceName: "Vem kan segla",
      file: { ...files[1], engine },
      files,
      view: controlsView(
        { ...IDLE_SNAPSHOT, status: "ready", duration: 120, ...snapshot },
        { mine: null, scoreTakesTaps: engine === "notation" },
      ),
      closeHref: "/app/koren/setlists/sl-1",
      controls: null,
      peaks,
    }),
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

describe("PlayerScreen for a notation File", () => {
  it("draws the score in place of the no-score note, saying so while it loads", () => {
    const loading = renderScreen({ status: "loading" }, null, "notation");

    expect(loading).toMatch(/<\/header>.*data-score-scroll.*data-score/);
    expect(textOf(loading)).toContain("Laddar noterna…");
    expect(textOf(loading)).not.toContain("inga noter");
    expect(textOf(renderScreen({}, null, "notation"))).not.toContain("Laddar noterna…");
    expect(textOf(renderScreen({ status: "error" }, null, "notation"))).toContain("Filen kunde inte spelas upp.");
  });
});

describe("PlayerScreen with parts", () => {
  const parts = [part("Sopran"), part("Alt")];

  it("offers Stämmor on the phone and on desktop only for a File with parts", () => {
    const html = renderScreen({ parts }, null, "midi");

    expect(textOf(html.match(/<footer[^>]*md:hidden[^>]*>.*?<\/footer>/)?.[0] ?? "")).toMatch(/Repetera.*Stämmor/);
    expect(textOf(desktopTransport(html))).toMatch(/Repetera\s*Stämmor$/);
    expect(textOf(renderScreen({}, null, "midi"))).not.toContain("Stämmor");
  });
});

describe("PartsControls", () => {
  function partsView({
    parts = [part("Sopran"), part("Alt", { muted: true }), part("Trummor", { percussion: true, solo: true })],
    sound = "piano",
    mine = null,
  }: Partial<Pick<PlayerSnapshot, "parts" | "sound">> & { mine?: string | null } = {}) {
    return controlsView({ ...IDLE_SNAPSHOT, parts, sound }, { mine, scoreTakesTaps: false }).parts;
  }
  function renderParts(props: Partial<Parameters<typeof PartsControls>[0]> = {}) {
    return renderMarkup(createElement(PartsControls, { parts: partsView(), run: () => {}, numbered: false, ...props }));
  }
  const pressed = (html: string) =>
    [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>(.*?)<\/button>/g)].map(([, label]) => textOf(label));
  const buttons = (html: string) =>
    [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(([attributes, , label]) => ({
      label: textOf(label),
      disabled: /\sdisabled=""/.test(attributes),
    }));

  it("starts with the Kör | Piano switch, piano chosen", () => {
    const html = renderParts();

    expect(
      buttons(html)
        .slice(0, 2)
        .map(({ label }) => label),
    ).toEqual(["Kör", "Piano"]);
    expect(pressed(html)).toContain("Piano");
    expect(pressed(renderParts({ parts: partsView({ sound: "choir" }) }))).toContain("Kör");
  });

  it("offers the voices, not percussion, as Min stämma, and the presets only once one is chosen", () => {
    const labels = (html: string) => buttons(html).slice(2, 8);

    expect(labels(renderParts())).toEqual([
      { label: "Sopran", disabled: false },
      { label: "Alt", disabled: false },
      { label: "Alla lika", disabled: false },
      { label: "Framhäv min", disabled: true },
      { label: "Utan min", disabled: true },
      { label: "Bara min", disabled: true },
    ]);
    expect(labels(renderParts({ parts: partsView({ mine: "Alt" }) })).every(({ disabled }) => !disabled)).toBe(true);
  });

  it("marks my part and the preset the mix matches", () => {
    const equal = [part("Sopran"), part("Alt")];

    expect(pressed(renderParts({ parts: partsView({ parts: equal, mine: "Alt" }) }))).toEqual([
      "Piano",
      "Alt",
      "Alla lika",
    ]);
    expect(
      pressed(
        renderParts({ parts: partsView({ parts: [part("Sopran"), part("Alt", { muted: true })], mine: "Alt" }) }),
      ),
    ).toEqual(["Piano", "Alt", "Utan min", "M"]);
  });

  it("has a row per part with volume, M and S, percussion marked slagverk", () => {
    const html = renderParts();

    expect(html).toMatch(/aria-label="Volym Sopran"/);
    expect(html).toMatch(/<button(?=[^>]*aria-label="Tysta Alt")[^>]*aria-pressed="true"/);
    expect(html).toMatch(/<button(?=[^>]*aria-label="Solo Trummor")[^>]*aria-pressed="true"/);
    expect(textOf(html)).toMatch(/Trummor\s*slagverk/);
  });

  it("numbers the parts for the keys 1–9 on desktop", () => {
    const keys = (html: string) => [...html.matchAll(/<kbd[^>]*>(.*?)<\/kbd>/g)].map(([, key]) => key);

    expect(keys(renderParts({ numbered: true }))).toEqual(["1", "2", "3"]);
    expect(keys(renderParts())).toEqual([]);
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
    const bars = [...strip.matchAll(/data-bar="(played|ahead)"[^>]*style="height:(\d+)%"/g)].map(
      ([, state, height]) => [state, Number(height)],
    );

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
