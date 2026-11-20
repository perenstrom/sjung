import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { hasLink, renderMarkup, textOf } from "@/lib/testing/markup";
import { PersonPiecesList } from "./PersonPiecesList";

function render(pieces: { pieceId: string; name: string; roles: string[] }[]): string {
  return renderMarkup(createElement(PersonPiecesList, { groupSlug: "kor", pieces }));
}

describe("PersonPiecesList", () => {
  it("links each Piece to its page and shows the Person's roles on it", () => {
    const html = render([
      { pieceId: "ave", name: "Ave Maria", roles: ["Arrangör", "Textförfattare"] },
      { pieceId: "kyrie", name: "Kyrie", roles: ["Kompositör"] },
    ]);

    expect(hasLink(html, "/app/kor/pieces/ave", "Ave Maria")).toBe(true);
    expect(hasLink(html, "/app/kor/pieces/kyrie", "Kyrie")).toBe(true);
    expect(textOf(html)).toBe("Ave MariaArrangörTextförfattareKyrieKompositör");
  });

  it("says so when the Person has no Credits", () => {
    expect(textOf(render([]))).toBe("Inga noter med den här personen ännu.");
  });
});
