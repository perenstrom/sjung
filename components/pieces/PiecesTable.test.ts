import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PiecesTable } from "./PiecesTable";

// The dialogs, popovers and step actions import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/people", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("@/app/actions/setlists", () => ({
  deleteSetListNote: vi.fn(),
  reorderSetListSteps: vi.fn(),
  removePieceFromSetList: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const editMode = vi.hoisted(() => ({ isEditing: false }));
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: true, isEditing: editMode.isEditing, setIsEditing: vi.fn() }),
}));

const piece = {
  id: "piece-1",
  name: "Vem kan segla",
  credits: [
    { personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } },
    { personId: "person-1", role: "Textförfattare", person: { name: "Anna Andersson" } },
  ],
  files: [],
  links: [],
  notes: [],
} as unknown as PieceWithRelations;

function renderPieces(): string {
  return renderMarkup(
    createElement(PiecesTable, { people: [], groupSlug: "koren", pieces: [piece] }),
  );
}

function renderSetList(): string {
  const steps = [{ kind: "piece", id: "step-1", position: 0, piece }] as unknown as SetListStep[];
  return renderMarkup(
    createElement(PiecesTable, {
      people: [],
      groupSlug: "koren",
      setList: { id: "setlist-1", steps },
    }),
  );
}

describe.each([
  ["Noter", renderPieces],
  ["set list", renderSetList],
])("PiecesTable for %s", (_, render) => {
  describe("in edit mode", () => {
    beforeEach(() => {
      editMode.isEditing = true;
    });

    it("has no Redigera button", () => {
      expect(render()).not.toMatch(/>Redigera</);
    });

    it("offers to rename the piece next to its name", () => {
      expect(render()).toMatch(/>Vem kan segla<\/a>.*?aria-label="Byt namn på Vem kan segla"/);
    });

    it("lets each Credit role be removed on its own", () => {
      const html = render();

      expect(html).toContain('aria-label="Ta bort Anna Andersson som Kompositör"');
      expect(html).toContain('aria-label="Ta bort Anna Andersson som Textförfattare"');
    });
  });

  describe("in read mode", () => {
    beforeEach(() => {
      editMode.isEditing = false;
    });

    it("shows the name as a link with no way to rename it", () => {
      const html = render();

      expect(textOf(html)).toContain("Vem kan segla");
      expect(html).not.toContain("Byt namn");
    });

    it("has no way to remove a credit", () => {
      expect(render()).not.toContain("Ta bort Anna Andersson");
    });
  });
});
