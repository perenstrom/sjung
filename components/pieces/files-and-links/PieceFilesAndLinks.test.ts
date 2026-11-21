import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { fileDownloadHref } from "@/lib/pieces/href";
import { renderMarkup, textOf } from "@/lib/testing/markup";

import { PieceFilesAndLinks } from "./PieceFilesAndLinks";

// The rows and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
let isEditing = false;
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: isEditing, isEditing, setIsEditing: vi.fn() }),
}));

const file = (displayName: string, category: string | null = null): PieceFileListItem => ({
  id: displayName,
  displayName,
  size: 1024,
  category,
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
  { editing = false } = {}
): string {
  isEditing = editing;
  return renderMarkup(
    createElement(PieceFilesAndLinks, {
      layout,
      groupSlug: "koren",
      piece: { id: "piece-1", name: "Vem kan segla" },
      filesAndLinks: { files, links },
    })
  );
}

/**
 * What the reader sees, in order: Category headings as "### …", File and
 * Link names, and "[add]" where adding starts (nothing after it).
 */
function shownSequence(html: string): string[] {
  const shown = [
    ...html.matchAll(
      /<(?:h3|p) class="text-xs font-medium[^"]*">(.*?)<\/(?:h3|p)>|<a[^>]*>(.*?)<\/a>|(aria-label="(?:Fil|Ladda upp fil)")/g
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
    const html = render(
      layout,
      [file("sopran.pdf"), file("Alt.pdf")],
      [link("Bas"), { id: "l2", url: "https://www.youtube.com/watch", label: null, category: null }]
    );

    expect(shownSequence(html)).toEqual(["Alt.pdf", "Bas", "sopran.pdf", "www.youtube.com"]);
  });

  it.each([false, true])(
    "shows a heading per Category in ranking order, each sorted by name, Övrigt last (Edit mode: %s)",
    (editing) => {
      const html = render(
        layout,
        [file("Sopran.pdf", "Inspelningar"), file("Text.pdf"), file("Tenor.pdf", "Noter")],
        [link("Alt", "Inspelningar"), link("Annat")],
        { editing }
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
    }
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
      />Sopran_stämma_REV<\/span><span[^>]*shrink-0[^>]*>IDERAD\.pdf</
    );
  });

  it("offers adding a File before adding a Link in Edit mode", () => {
    const html = render("inline", [], [], { editing: true });

    expect(html.indexOf("Ladda upp fil")).toBeGreaterThan(-1);
    expect(html.indexOf("Ladda upp fil")).toBeLessThan(html.indexOf("Lägg till länk"));
  });
});
