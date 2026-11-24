import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { fileDownloadHref, playerHref } from "@/lib/pieces/href";
import type { Playback } from "@/lib/pieces/playback";
import { renderMarkup, textOf } from "@/lib/testing/markup";

import { PieceFilesAndLinks } from "./PieceFilesAndLinks";

// The rows and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
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
): PieceFileListItem => ({
  id: displayName,
  displayName,
  size: 1024,
  category,
  playback,
});
const link = (label: string, category: string | null = null): PieceLink => ({
  id: label,
  url: "https://example.com",
  label,
  category,
});

function render(
  layout: "detail" | "inline",
  files: PieceFileListItem[],
  links: PieceLink[],
  {
    editing = false,
    manager = editing,
    setListPieceId,
  }: { editing?: boolean; manager?: boolean; setListPieceId?: string } = {},
): string {
  isEditing = editing;
  canEdit = manager;
  return renderMarkup(
    createElement(PieceFilesAndLinks, {
      layout,
      groupSlug: "koren",
      piece: { id: "piece-1", name: "Vem kan segla" },
      filesAndLinks: { files, links },
      setListPieceId,
    }),
  );
}

/**
 * What the reader sees, in order: Category headings as "### …", File and
 * Link names, and "[add]" where adding starts (nothing after it).
 */
function shownSequence(html: string): string[] {
  const shown = [
    ...html.matchAll(
      /<(?:h3|p) class="text-xs font-medium[^"]*">(.*?)<\/(?:h3|p)>|<a[^>]*>(.*?)<\/a>|(aria-label="(?:Fil|Ladda upp fil)")/g,
    ),
  ].map(([, category, item, add]) => {
    if (category !== undefined) return `### ${textOf(category).trim()}`;
    if (add !== undefined) return "[add]";
    return textOf(item).replace(", öppnas i ny flik", "").trim();
  });
  const add = shown.indexOf("[add]");
  return add === -1 ? shown : shown.slice(0, add + 1);
}

describe.each(["detail", "inline"] as const)("PieceFilesAndLinks, %s layout", (layout) => {
  it("lists Files and Links together by name without headings when nothing has a Category", () => {
    const html = render(layout, [file("sopran.pdf"), file("Alt.pdf")], [link("Bas")]);

    expect(shownSequence(html)).toEqual(["Alt.pdf", "Bas", "sopran.pdf"]);
  });

  it.each([false, true])(
    "shows a heading per Category in ranking order, each sorted by name, Övrigt last (Edit mode: %s)",
    (editing) => {
      const html = render(
        layout,
        [file("Sopran.pdf", "Inspelningar"), file("Text.pdf"), file("Tenor.pdf", "Noter")],
        [link("Alt", "Inspelningar"), link("Annat")],
        { editing },
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
        ...(editing ? ["[add]"] : []),
      ]);
    },
  );

  it.each([
    { case: "nothing has a Category", category: null, expected: ["Sopran.pdf"] },
    { case: "something has a Category", category: "Noter", expected: ["### Noter", "Sopran.pdf"] },
  ])("puts adding last in Edit mode when $case", ({ category, expected }) => {
    expect(shownSequence(render(layout, [file("Sopran.pdf", category)], [], { editing: true }))).toEqual([
      ...expected,
      "[add]",
    ]);
  });

  it.each([false, true])("opens a File through a plain link in a new tab (Edit mode: %s)", (editing) => {
    const html = render(layout, [file("Sopran.pdf")], [], { editing });
    const tag = html.match(new RegExp(`<a[^>]*href="${fileDownloadHref("koren", "Sopran.pdf")}"[^>]*>`))?.[0];

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
      const open = anchors.find((tag) => tag.includes(`href="${playerHref("koren", "piece-1", "Sopran.mp3")}"`));
      const download = anchors.find((tag) => tag.includes(`href="${fileDownloadHref("koren", "Sopran.mp3")}"`));

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
      expect(html).not.toContain(playerHref("koren", "piece-1", "Partitur.mscz"));
      expect(anchors.filter((tag) => tag.includes(`href="${fileDownloadHref("koren", "Partitur.mscz")}"`))).toEqual([
        expect.not.stringContaining("aria-label"),
      ]);
    },
  );

  it("shows a singer a MuseScore File that couldn't be prepared as an ordinary File to download, with no error", () => {
    const html = render(layout, [file("Partitur.mscz", null, "failed")], []);

    expect(textOf(html)).not.toContain("Förbereds…");
    expect(textOf(html)).not.toContain("Kunde inte förberedas");
    expect(textOf(html)).not.toContain("Försök igen");
    expect(html).not.toContain(playerHref("koren", "piece-1", "Partitur.mscz"));
    expect(html).toContain(`href="${fileDownloadHref("koren", "Partitur.mscz")}"`);
  });

  it.each([false, true])(
    "tells someone with Manage content a MuseScore File couldn't be prepared, offering a retry or MusicXML (Edit mode: %s)",
    (editing) => {
      const html = render(layout, [file("Partitur.mscz", null, "failed")], [], { editing, manager: true });

      expect(textOf(html)).toContain("Kunde inte förberedas");
      expect(html).toMatch(/<button[^>]*>Försök igen<\/button>/);
      expect(textOf(html)).toContain("MusicXML");
      expect(html).not.toContain(playerHref("koren", "piece-1", "Partitur.mscz"));
    },
  );

  it.each([
    { editing: false, retry: false },
    { editing: true, retry: true },
  ])(
    "offers someone with Manage content to retry a File still being prepared only in Edit mode ($editing)",
    ({ editing, retry }) => {
      const html = render(layout, [file("Partitur.mscz", null, "preparing")], [], { editing, manager: true });

      expect(textOf(html).includes("Försök igen")).toBe(retry);
    },
  );

  it("on a Set list piece, opens the player for that Set list piece", () => {
    const html = render(layout, [file("Sopran.mp3", null, "ready")], [], { setListPieceId: "slp-1" });
    const href = playerHref("koren", "piece-1", "Sopran.mp3", { fromSetListPieceId: "slp-1" });

    expect(html).toContain(`href="${href}"`);
  });

  it("offers no changes outside Edit mode", () => {
    const html = render(layout, [file("Sopran.pdf")], [link("Inspelning")]);

    expect(html).not.toContain("Ta bort");
    expect(html).not.toContain("Ladda upp fil");
    expect(html).not.toContain('aria-label="Fil"');
  });
});

describe("PieceFilesAndLinks, detail layout", () => {
  it("says there is nothing yet when there are no Files or Links", () => {
    expect(textOf(render("detail", [], []))).toContain("Inga filer eller länkar tillagda ännu.");
  });
});

describe("PieceFilesAndLinks, inline layout", () => {
  it("shows nothing when there are no Files or Links", () => {
    expect(textOf(render("inline", [], [])).trim()).toBe("");
  });

  it("keeps the end of a long File name in its own part, which never shrinks", () => {
    expect(render("inline", [file("Sopran_stämma_REVIDERAD.pdf")], [])).toMatch(
      />Sopran_stämma_REV<\/span><span[^>]*shrink-0[^>]*>IDERAD\.pdf</,
    );
  });

  it("offers adding a File before adding a Link in Edit mode", () => {
    const html = render("inline", [], [], { editing: true });

    expect(html.indexOf("Ladda upp fil")).toBeGreaterThan(-1);
    expect(html.indexOf("Ladda upp fil")).toBeLessThan(html.indexOf("Lägg till länk"));
  });
});
