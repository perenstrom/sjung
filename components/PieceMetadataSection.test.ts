import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceMetadataSection } from "./PieceMetadataSection";

vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const editMode = vi.hoisted(() => ({ isEditing: false }));
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: true, isEditing: editMode.isEditing, setIsEditing: vi.fn() }),
}));

function render(): string {
  return renderMarkup(
    createElement(PieceMetadataSection, {
      groupSlug: "koren",
      pieceId: "piece-1",
      initialName: "Vem kan segla",
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
  });

  describe("in read mode", () => {
    beforeEach(() => {
      editMode.isEditing = false;
    });

    it("has no way to rename the piece", () => {
      expect(render()).not.toContain("Byt namn");
    });
  });
});
