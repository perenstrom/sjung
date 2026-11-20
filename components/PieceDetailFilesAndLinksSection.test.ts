import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceDetailFilesAndLinksSection } from "./PieceDetailFilesAndLinksSection";

// The lists and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
let isEditing = false;
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: isEditing, isEditing, setIsEditing: vi.fn() }),
}));

function render(files: PieceFileListItem[], links: PieceLink[], { editing = false } = {}): string {
  isEditing = editing;
  return renderMarkup(
    createElement(PieceDetailFilesAndLinksSection, {
      groupSlug: "koren",
      pieceId: "piece-1",
      pieceName: "Vem kan segla",
      files,
      links,
    })
  );
}

/**
 * What the reader sees, in order: section titles as "## …", Category
 * subheadings as "### …", File and Link names, and "[add rows]" where the
 * add-File row starts (nothing after it: the add rows' own links are noise).
 */
function shownSequence(html: string): string[] {
  const shown = [
    ...html.matchAll(/<h2[^>]*>(.*?)<\/h2>|<h3[^>]*>(.*?)<\/h3>|<a[^>]*>(.*?)<\/a>|(aria-label="Fil")/g),
  ].map(([, section, category, item, addRow]) => {
    if (section !== undefined) return `## ${textOf(section).trim()}`;
    if (category !== undefined) return `### ${textOf(category).trim()}`;
    if (addRow !== undefined) return "[add rows]";
    return textOf(item).replace(", öppnas i ny flik", "").trim();
  });
  const addRows = shown.indexOf("[add rows]");
  return addRows === -1 ? shown : shown.slice(0, addRows + 1);
}

const file = (displayName: string, category: string | null): PieceFileListItem => ({
  id: displayName,
  displayName,
  size: 1024,
  category,
});
const link = (label: string, category: string | null): PieceLink => ({
  id: label,
  url: "https://example.com",
  label,
  category,
});

describe("PieceDetailFilesAndLinksSection", () => {
  it("shows one Filer och länkar section, Files before Links, when nothing has a Category", () => {
    expect(shownSequence(render([file("Sopran.pdf", null)], [link("Inspelning", null)]))).toEqual([
      "## Filer och länkar",
      "Sopran.pdf",
      "Inspelning",
    ]);
  });

  it("shows the empty state in the one section when there is nothing", () => {
    const html = render([], []);

    expect(shownSequence(html)).toEqual(["## Filer och länkar"]);
    expect(textOf(html)).toContain("Inga filer eller länkar tillagda ännu.");
  });

  it("shows a subheading per Category in ranking order inside the one section, Files before Links, Övrigt last", () => {
    const html = render(
      [file("Sopran.pdf", "Inspelningar"), file("Alt.pdf", null), file("Tenor.pdf", "Noter")],
      [link("Inspelning", "Inspelningar"), link("Text", null)]
    );

    expect(shownSequence(html)).toEqual([
      "## Filer och länkar",
      "### Noter",
      "Tenor.pdf",
      "### Inspelningar",
      "Sopran.pdf",
      "Inspelning",
      "### Övrigt",
      "Alt.pdf",
      "Text",
    ]);
  });

  it.each([
    { case: "nothing has a Category", category: null, expected: ["Sopran.pdf"] },
    { case: "something has a Category", category: "Noter", expected: ["### Noter", "Sopran.pdf"] },
  ])("puts the add rows last in the one section in edit mode when $case", ({ category, expected }) => {
    expect(shownSequence(render([file("Sopran.pdf", category)], [], { editing: true }))).toEqual([
      "## Filer och länkar",
      ...expected,
      "[add rows]",
    ]);
  });
});
