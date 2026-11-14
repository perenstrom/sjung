import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PiecesMobileList } from "./PiecesMobileList";

// The dialogs, popovers and step actions import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/people", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("@/app/actions/setlists", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const piece = {
  id: "piece-1",
  name: "Vem kan segla",
  credits: [],
  files: [
    { id: "file-1", displayName: "Sopran.pdf", size: 1024 },
    { id: "file-2", displayName: "Alt.pdf", size: 1024 },
  ],
  links: [{ id: "link-1", url: "https://example.com/inspelning", label: "Inspelning" }],
} as unknown as PieceWithRelations;

function renderPieces(isEditing: boolean): string {
  return renderMarkup(
    createElement(PiecesMobileList, { people: [], groupSlug: "koren", isEditing, pieces: [piece] }),
  );
}

function renderSetList(isEditing: boolean): string {
  const steps = [{ kind: "piece", id: "step-1", position: 0, piece }] as unknown as SetListStep[];
  return renderMarkup(
    createElement(PiecesMobileList, {
      people: [],
      groupSlug: "koren",
      isEditing,
      setList: { id: "setlist-1", steps },
    }),
  );
}

describe("PiecesMobileList", () => {
  describe.each([
    ["Noter, read mode", () => renderPieces(false)],
    ["Noter, edit mode", () => renderPieces(true)],
    ["running order, read mode", () => renderSetList(false)],
    ["running order, edit mode", () => renderSetList(true)],
  ])("a closed piece row in the %s", (_, render) => {
    const html = render();

    it("shows the piece name", () => {
      expect(textOf(html)).toContain("Vem kan segla");
    });

    it("shows no file or link counts", () => {
      expect(html).not.toContain("lucide-file-text");
      expect(html).not.toContain("lucide-external-link");
      expect(textOf(html)).not.toMatch(/\d (fil|filer|länk|länkar)\b/);
    });
  });
});
