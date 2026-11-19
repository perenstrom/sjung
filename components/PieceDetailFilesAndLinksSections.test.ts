import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceDetailFilesAndLinksSections } from "./PieceDetailFilesAndLinksSections";

// The lists and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: false, isEditing: false, setIsEditing: vi.fn() }),
}));

function render(files: PieceFileListItem[], links: PieceLink[]): string {
  return renderMarkup(
    createElement(PieceDetailFilesAndLinksSections, {
      groupSlug: "koren",
      pieceId: "piece-1",
      pieceName: "Vem kan segla",
      files,
      links,
    })
  );
}

/** The section titles and File and Link names, in the order shown. */
function shownSequence(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>|<a[^>]*>(.*?)<\/a>/g)].map((match) =>
    textOf(match[1] ?? match[2])
      .replace(", öppnas i ny flik", "")
      .trim()
  );
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

describe("PieceDetailFilesAndLinksSections", () => {
  it("shows one Filer och länkar section, Files before Links, when nothing has a Category", () => {
    expect(shownSequence(render([file("Sopran.pdf", null)], [link("Inspelning", null)]))).toEqual([
      "Filer och länkar",
      "Sopran.pdf",
      "Inspelning",
    ]);
  });

  it("shows a section per Category in ranking order, Files before Links, Övrigt last", () => {
    const html = render(
      [file("Sopran.pdf", "Inspelningar"), file("Alt.pdf", null), file("Tenor.pdf", "Noter")],
      [link("Inspelning", "Inspelningar"), link("Text", null)]
    );

    expect(shownSequence(html)).toEqual([
      "Noter",
      "Tenor.pdf",
      "Inspelningar",
      "Sopran.pdf",
      "Inspelning",
      "Övrigt",
      "Alt.pdf",
      "Text",
    ]);
  });
});
