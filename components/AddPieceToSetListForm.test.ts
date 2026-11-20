import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { AddPieceToSetListForm } from "./AddPieceToSetListForm";

// The form posts to a server action, which reaches the database.
vi.mock("@/app/actions/setlists", () => ({}));

function renderForm(pieces: { id: string; name: string; aliases: { name: string }[] }[]): string {
  return renderMarkup(
    createElement(AddPieceToSetListForm, { groupSlug: "koren", setListId: "set-list-1", pieces }),
  );
}

const pieces = [
  { id: "piece-1", name: "Vem kan segla", aliases: [] },
  { id: "piece-2", name: "Uti vår hage", aliases: [{ name: "Hagen" }] },
];

describe("AddPieceToSetListForm", () => {
  it("picks the Piece with one combobox and nothing picked yet", () => {
    const html = renderForm(pieces);

    expect(html).toMatch(/<button[^>]*role="combobox"/);
    expect(html).not.toMatch(/<input[^>]*type="search"/);
    expect(textOf(html)).toContain("Välj stycke…");
  });

  it("can't add before a Piece is picked", () => {
    expect(renderForm(pieces)).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });
});
