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

    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html.indexOf("Nyast\nmed radbrytning")).toBeLessThan(html.indexOf("Äldst"));
    expect(html).toContain("whitespace-pre-wrap");
  });

  it("cuts each note off after 3 lines until it's expanded", () => {
    const html = renderMarkup(
      createElement(PieceNotesList, { notes: [{ id: "note-1", content: "Lång anteckning" }] }),
    );

    expect(html).toContain("line-clamp-3");
    expect(textOf(html)).toBe("Lång anteckning");
  });
});
