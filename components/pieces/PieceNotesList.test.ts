import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceNotesList } from "./PieceNotesList";

describe("PieceNotesList", () => {
  it("renders nothing for a piece without notes", () => {
    expect(renderMarkup(createElement(PieceNotesList, { notes: [] }))).toBe("");
  });

  it("lists the note texts in the order given, keeping line breaks", () => {
    const html = renderMarkup(
      createElement(PieceNotesList, {
        notes: [
          { id: "note-1", content: "Nyast\nmed radbrytning" },
          { id: "note-2", content: "Äldst" },
        ],
      }),
    );

    expect(textOf(html)).toMatch(/Nyast med radbrytning.*Äldst/);
    expect(html).toContain("Nyast\nmed radbrytning");
  });

  // Line breaks and the 3-line cut-off are CSS only a browser shows, so these
  // classes are the one thing pinning them. Kept for the maintainer to decide (PER-505).
  it("shows each note's line breaks and cuts it off after 3 lines", () => {
    const html = renderMarkup(createElement(PieceNotesList, { notes: [{ id: "note-1", content: "Lång anteckning" }] }));

    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("line-clamp-3");
  });
});
