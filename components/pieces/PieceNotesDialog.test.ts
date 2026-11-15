import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceNotesDialog } from "./PieceNotesDialog";

// The notes panel imports server actions, which reach the database.
vi.mock("@/app/actions/pieces", () => ({}));
// useRouter throws outside the app router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function renderTrigger(hasNotes: boolean): string {
  return renderMarkup(
    createElement(PieceNotesDialog, {
      groupSlug: "koren",
      piece: { id: "piece-1", name: "Vem kan segla" },
      hasNotes,
    }),
  );
}

describe("PieceNotesDialog", () => {
  it("offers to edit the notes of a piece that has notes", () => {
    expect(textOf(renderTrigger(true))).toBe("Redigera anteckningar");
  });

  it("offers to add a note to a piece without notes", () => {
    expect(textOf(renderTrigger(false))).toBe("Lägg till anteckning");
  });

  it("is triggered by a link-styled button", () => {
    const html = renderTrigger(true);

    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toMatch(/^<button[^>]*class="[^"]*underline/);
  });
});
