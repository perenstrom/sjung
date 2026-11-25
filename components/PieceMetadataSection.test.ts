import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceMetadataSection } from "./PieceMetadataSection";

vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const editMode = vi.hoisted(() => ({ isEditing: false }));
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: true, isEditing: editMode.isEditing, setIsEditing: vi.fn() }),
  useEditModeToggle: () => ({ isOffered: true, isEditing: editMode.isEditing, setIsEditing: vi.fn() }),
}));

const twoAliases = [
  { id: "a-1", name: "Julsången" },
  { id: "a-2", name: "Den långa" },
];

function render(aliases: { id: string; name: string }[] = twoAliases): string {
  return renderMarkup(
    createElement(PieceMetadataSection, {
      groupSlug: "koren",
      pieceId: "piece-1",
      initialName: "Vem kan segla",
      aliases,
      fromSetListId: undefined,
    }),
  );
}

describe("PieceMetadataSection", () => {
  describe("in edit mode", () => {
    beforeEach(() => {
      editMode.isEditing = true;
    });

    it("shows the name as a heading with the shared rename button", () => {
      const html = render();

      expect(html).toMatch(/<h1[^>]*>Vem kan segla<\/h1>.*?aria-label="Byt namn på Vem kan segla"/);
      expect(textOf(html)).not.toContain("Byt namn");
    });

    it("lists each Alias with a way to remove it, and a field to add one", () => {
      const html = render();

      expect(html).toMatch(/Julsången.*?aria-label="Ta bort Julsången".*?Den långa.*?aria-label="Ta bort Den långa"/);
      expect(html).toContain('aria-label="Lägg till alternativt namn"');
      expect(textOf(html)).not.toContain("Även kallad");
    });
  });

  describe("in read mode", () => {
    beforeEach(() => {
      editMode.isEditing = false;
    });

    it("has no way to rename the piece", () => {
      expect(render()).not.toContain("Byt namn");
    });

    it("says what else the piece is called, in order, under its name", () => {
      expect(render()).toMatch(/<h1[^>]*>Vem kan segla<\/h1>.*?Även kallad Julsången, Den långa/);
    });

    it("has no way to add or remove an Alias", () => {
      const html = render();

      expect(html).not.toContain("Ta bort");
      expect(html).not.toContain("Lägg till alternativt namn");
    });

    it("says nothing about Aliases for a piece without any", () => {
      expect(textOf(render([]))).not.toContain("Även kallad");
    });
  });
});
