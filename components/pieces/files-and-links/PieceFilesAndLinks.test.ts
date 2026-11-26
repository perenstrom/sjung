import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { fileDownloadHref, playerHref } from "@/lib/pieces/href";
import type { PlayerEngine } from "@/lib/file-formats";
import type { Playback } from "@/lib/pieces/playback";
import type { SetListPieceHides } from "@/lib/setlists/hidden";
import { renderMarkup, textOf } from "@/lib/testing/markup";

import { PieceFilesAndLinks } from "./PieceFilesAndLinks";

// The rows and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("@/app/actions/setlists", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
let canEdit = false;
let isEditing = false;
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit, isEditing, setIsEditing: vi.fn() }),
}));

const file = (
  displayName: string,
  category: string | null = null,
  playback: Playback | null = null,
  engine: PlayerEngine | null = null,
): PieceFileListItem => ({
  id: displayName,
  slug: displayName,
  displayName,
  size: 1024,
  category,
  playback,
  engine,
});
const link = (label: string, category: string | null = null): PieceLink => ({
  id: label,
  url: "https://example.com",
  label,
  category,
});

const PIECE = { id: "piece-1", slug: "vem-kan-segla", name: "Vem kan segla" };

/** A Set list piece "slp-1" hiding the Files and Links with these ids (the test items' ids are their names). */
function onSetListPiece(hidden: string[] = [], setListName?: string): SetListPieceHides {
  return { id: "slp-1", hiddenFileIds: hidden, hiddenLinkIds: hidden, setListName };
}

function render(
  layout: "detail" | "inline",
  files: PieceFileListItem[],
  links: PieceLink[],
  {
    editing = false,
    canManageContent = editing,
    setListPiece,
  }: { editing?: boolean; canManageContent?: boolean; setListPiece?: SetListPieceHides } = {},
): string {
  isEditing = editing;
  canEdit = canManageContent;
  return renderMarkup(
    createElement(PieceFilesAndLinks, {
      layout,
      groupSlug: "koren",
      piece: PIECE,
      filesAndLinks: { files, links },
      setListPiece,
    }),
  );
}

/**
 * What the reader sees, in order: Category headings as "### …", File and
 * Link names, and "[add]" where adding starts (nothing after it).
 */
function shownSequence(html: string): string[] {
  const shown = [
    ...html.matchAll(/<(?:h3|p)\b[^>]*>(.*?)<\/(?:h3|p)>|<a[^>]*>(.*?)<\/a>|(aria-label="(?:Fil|Ladda upp fil)")/g),
  ].map(([, category, item, add]) => {
    if (category !== undefined) return `### ${textOf(category).trim()}`;
    if (add !== undefined) return "[add]";
    return textOf(item).replace(", öppnas i ny flik", "").trim();
  });
  const add = shown.indexOf("[add]");
  return add === -1 ? shown : shown.slice(0, add + 1);
}

describe.each(["detail", "inline"] as const)("PieceFilesAndLinks, %s layout", (layout) => {
  // The grouping and order are groupByCategory's (lib/pieces/categories.test.ts); these prove the wiring.
  it("shows a heading per Category, Övrigt last, then adding, in Edit mode", () => {
    const html = render(
      layout,
      [file("Sopran.pdf", "Inspelningar"), file("Text.pdf"), file("Tenor.pdf", "Noter")],
      [link("Alt", "Inspelningar"), link("Annat")],
      { editing: true },
    );

    expect(shownSequence(html)).toEqual([
      "### Noter",
      "Tenor.pdf",
      "### Inspelningar",
      "Alt",
      "Sopran.pdf",
      "### Övrigt",
      "Annat",
      "Text.pdf",
      "[add]",
    ]);
  });

  it("lists Files and Links without headings when nothing has a Category, then adding, in Edit mode", () => {
    const html = render(layout, [file("sopran.pdf"), file("Alt.pdf")], [link("Bas")], { editing: true });

    expect(shownSequence(html)).toEqual(["Alt.pdf", "Bas", "sopran.pdf", "[add]"]);
  });

  it.each([false, true])("opens a File through a plain link in a new tab (Edit mode: %s)", (editing) => {
    const html = render(layout, [file("Sopran.pdf")], [], { editing });
    const tag = html.match(new RegExp(`<a[^>]*href="${fileDownloadHref("koren", { slug: "Sopran.pdf" })}"[^>]*>`))?.[0];

    // iOS Safari blocks a new tab opened after an await on the tap, so a File
    // opens through a plain link to its download route, never through script.
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
  });

  it.each([false, true])(
    "opens a Playable File in the player, with a small button to download it (Edit mode: %s)",
    (editing) => {
      const html = render(layout, [file("Sopran.mp3", null, "ready")], [], { editing });
      const anchors = [...html.matchAll(/<a[^>]*>/g)].map(([tag]) => tag);
      const open = anchors.find((tag) => tag.includes(`href="${playerHref("koren", PIECE, { slug: "Sopran.mp3" })}"`));
      const download = anchors.find((tag) =>
        tag.includes(`href="${fileDownloadHref("koren", { slug: "Sopran.mp3" })}"`),
      );

      expect(open).toBeDefined();
      expect(open).not.toContain('target="_blank"');
      expect(download).toContain('aria-label="Ladda ner Sopran.mp3"');
      expect(download).toContain('target="_blank"');
    },
  );

  it.each([false, true])(
    "says a MuseScore File is being prepared, and downloads it instead of opening the player (Edit mode: %s)",
    (editing) => {
      const html = render(layout, [file("Partitur.mscz", null, "preparing")], [], { editing });
      const anchors = [...html.matchAll(/<a[^>]*>/g)].map(([tag]) => tag);

      expect(textOf(html)).toContain("Förbereds…");
      expect(html).not.toContain(playerHref("koren", PIECE, { slug: "Partitur.mscz" }));
      expect(
        anchors.filter((tag) => tag.includes(`href="${fileDownloadHref("koren", { slug: "Partitur.mscz" })}"`)),
      ).toEqual([expect.not.stringContaining("aria-label")]);
    },
  );

  it.each([
    { case: "a MusicXML File", item: file("Partitur.mxl", null, "ready", "notation"), icon: "clef-treble" },
    {
      case: "a MuseScore File being prepared",
      item: file("Partitur.mscz", null, "preparing", "notation"),
      icon: "clef-treble",
    },
    {
      case: "a MuseScore File that couldn't be prepared",
      item: file("Partitur.mscz", null, "failed", "notation"),
      icon: "file-text",
    },
    { case: "an audio File", item: file("Sopran.mp3", null, "ready", "audio"), icon: "play" },
    { case: "a File that isn't a Playable File", item: file("Noter.pdf"), icon: "file-text" },
  ])("marks $case with the $icon icon", ({ item, icon }) => {
    const shown = [...render(layout, [item], []).matchAll(/lucide-(clef-treble|play|file-text)\b/g)].map(
      ([, name]) => name,
    );

    expect(shown).toEqual([icon]);
  });

  it("shows a singer a MuseScore File that couldn't be prepared as an ordinary File to download, with no error", () => {
    const html = render(layout, [file("Partitur.mscz", null, "failed")], []);

    expect(textOf(html)).not.toContain("Förbereds…");
    expect(textOf(html)).not.toContain("Kunde inte förberedas");
    expect(textOf(html)).not.toContain("Försök igen");
    expect(html).not.toContain(playerHref("koren", PIECE, { slug: "Partitur.mscz" }));
    expect(html).toContain(`href="${fileDownloadHref("koren", { slug: "Partitur.mscz" })}"`);
  });

  it.each([false, true])(
    "tells someone with Manage content a MuseScore File couldn't be prepared, offering a retry or MusicXML (Edit mode: %s)",
    (editing) => {
      const html = render(layout, [file("Partitur.mscz", null, "failed")], [], { editing, canManageContent: true });

      expect(textOf(html)).toContain("Kunde inte förberedas");
      expect(html).toMatch(/<button[^>]*>Försök igen<\/button>/);
      expect(textOf(html)).toContain("MusicXML");
      expect(html).not.toContain(playerHref("koren", PIECE, { slug: "Partitur.mscz" }));
    },
  );

  it.each([
    { editing: false, retry: false },
    { editing: true, retry: true },
  ])(
    "offers someone with Manage content to retry a File still being prepared only in Edit mode ($editing)",
    ({ editing, retry }) => {
      const html = render(layout, [file("Partitur.mscz", null, "preparing")], [], { editing, canManageContent: true });

      expect(textOf(html).includes("Försök igen")).toBe(retry);
    },
  );

  it("on a Set list piece outside Edit mode, leaves out what is Hidden there, Categories and all", () => {
    const html = render(layout, [file("Sopran.pdf", "Noter"), file("Alt.pdf")], [link("Inspelning", "Inspelningar")], {
      setListPiece: onSetListPiece(["Sopran.pdf", "Inspelning"]),
    });

    expect(shownSequence(html)).toEqual(["Alt.pdf"]);
  });

  it("on a Set list piece in Edit mode, shows what is Hidden dimmed, offering to hide or show each", () => {
    const html = render(layout, [file("Sopran.pdf"), file("Alt.pdf")], [link("Inspelning")], {
      editing: true,
      setListPiece: onSetListPiece(["Sopran.pdf", "Inspelning"]),
    });

    expect(shownSequence(html)).toEqual(["Alt.pdf", "Inspelning", "Sopran.pdf", "[add]"]);
    expect([...html.matchAll(/aria-label="((?:Dölj|Visa) [^"]*)"/g)].map(([, label]) => label)).toEqual([
      "Dölj Alt.pdf i repertoaren",
      "Visa Inspelning i repertoaren",
      "Visa Sopran.pdf i repertoaren",
    ]);
    expect(html.match(/<li[^>]*data-hidden[^>]*>/g)).toHaveLength(2);
  });

  it("names the Set list in the hide action where it is known", () => {
    const html = render(layout, [file("Alt.pdf")], [], {
      editing: true,
      setListPiece: onSetListPiece([], "Julkonsert 2026"),
    });

    expect(html).toContain('aria-label="Dölj Alt.pdf i &quot;Julkonsert 2026&quot;"');
  });

  it("offers no hiding without Manage content, nor outside a Set list piece", () => {
    const singer = render(layout, [file("Alt.pdf")], [], { setListPiece: onSetListPiece() });
    const catalog = render(layout, [file("Alt.pdf")], [], { editing: true });

    expect(singer).not.toContain("Dölj");
    expect(catalog).not.toContain("Dölj");
  });

  it("offers no changes outside Edit mode", () => {
    const html = render(layout, [file("Sopran.pdf")], [link("Inspelning")]);

    expect(html).not.toContain("Ta bort");
    expect(html).not.toContain("Ladda upp fil");
    expect(html).not.toContain('aria-label="Fil"');
  });
});

describe("PieceFilesAndLinks, detail layout", () => {
  it("opened from a Set list piece, opens the player on the Piece, to close back to it", () => {
    const html = render("detail", [file("Sopran.mp3", null, "ready")], [], {
      setListPiece: onSetListPiece([], "Julkonsert 2026"),
    });

    expect(html).toContain(`href="${playerHref("koren", PIECE, { slug: "Sopran.mp3" })}"`);
  });

  it("says there is nothing yet when there are no Files or Links", () => {
    expect(textOf(render("detail", [], []))).toContain("Inga filer eller länkar tillagda ännu.");
  });

  it("opened from a Set list piece that hides some, says how many, offering to show them", () => {
    const html = render("detail", [file("Sopran.pdf"), file("Alt.pdf")], [link("Inspelning")], {
      setListPiece: onSetListPiece(["Sopran.pdf", "Inspelning"], "Julkonsert 2026"),
    });

    expect(textOf(html)).toContain('2 filer och länkar är dolda i "Julkonsert 2026".');
    expect(html).toMatch(/<button[^>]*>Visa alla<\/button>/);
  });

  it("opened from a Set list piece that hides everything, says only that", () => {
    const html = render("detail", [file("Sopran.pdf")], [], {
      setListPiece: onSetListPiece(["Sopran.pdf"], "Julkonsert 2026"),
    });

    expect(textOf(html)).toContain('En fil eller länk är dold i "Julkonsert 2026".');
    expect(textOf(html)).not.toContain("Inga filer eller länkar");
  });

  it.each([
    { case: "nothing is Hidden", editing: false, hidden: [] },
    { case: "in Edit mode", editing: true, hidden: ["Sopran.pdf"] },
  ])("gives no notice when $case", ({ editing, hidden }) => {
    const html = render("detail", [file("Sopran.pdf")], [], {
      editing,
      setListPiece: onSetListPiece(hidden, "Julkonsert 2026"),
    });

    expect(textOf(html)).not.toContain("dold");
    expect(textOf(html)).not.toContain("Visa alla");
  });
});

describe("PieceFilesAndLinks, inline layout", () => {
  it("on a Set list piece, opens the player for that Set list piece", () => {
    const html = render("inline", [file("Sopran.mp3", null, "ready")], [], { setListPiece: onSetListPiece() });
    const href = playerHref("koren", PIECE, { slug: "Sopran.mp3" }, { fromSetListPieceId: "slp-1" });

    expect(html).toContain(`href="${href}"`);
  });

  it("shows nothing when there are no Files or Links", () => {
    expect(textOf(render("inline", [], [])).trim()).toBe("");
  });

  it("shows nothing, and gives no notice, when everything is Hidden on the Set list piece", () => {
    const html = render("inline", [file("Sopran.pdf")], [], { setListPiece: onSetListPiece(["Sopran.pdf"]) });

    expect(textOf(html).trim()).toBe("");
  });

  it("keeps the end of a long File name in a part of its own, so it stays visible when the name is cut short", () => {
    expect(render("inline", [file("Sopran_stämma_REVIDERAD.pdf")], [])).toMatch(
      />Sopran_stämma_REV<\/span><span[^>]*>IDERAD\.pdf</,
    );
  });

  it("offers adding a File before adding a Link in Edit mode", () => {
    const html = render("inline", [], [], { editing: true });

    expect(html.indexOf("Ladda upp fil")).toBeGreaterThan(-1);
    expect(html.indexOf("Ladda upp fil")).toBeLessThan(html.indexOf("Lägg till länk"));
  });
});
