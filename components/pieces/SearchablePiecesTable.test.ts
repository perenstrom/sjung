import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceWithRelations } from "@/lib/pieces/types";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { SearchablePiecesTable } from "./SearchablePiecesTable";

// The dialogs and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/people", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("@/app/actions/setlists", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: false, isEditing: false, setIsEditing: vi.fn() }),
}));

const piece = {
  id: "piece-1",
  name: "Vem kan segla",
  credits: [],
  files: [],
  links: [],
  aliases: [],
  notes: [],
} as unknown as PieceWithRelations;

describe("SearchablePiecesTable", () => {
  const html = renderMarkup(
    createElement(SearchablePiecesTable, { people: [], creditRoles: [], groupSlug: "koren", pieces: [piece] }),
  );

  it("shows a labelled search box above the list, with Swedish placeholder text", () => {
    const input = html.match(/<input[^>]*>/)?.[0] ?? "";

    expect(input).toContain('type="search"');
    expect(input).toContain('aria-label="Sök stycke eller upphovsperson"');
    expect(input).toMatch(/placeholder="Sök[^"]*"/);
    expect(html.indexOf("<input")).toBeLessThan(html.indexOf("<ul"));
  });

  it("starts empty, showing every piece and no clear button", () => {
    expect(html.match(/<input[^>]*>/)?.[0]).not.toMatch(/value="[^"]+"/);
    expect(textOf(html)).toContain("Vem kan segla");
    expect(html).not.toContain("Rensa sökning");
  });
});
