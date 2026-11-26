import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { pieceHref, playerHref } from "@/lib/pieces/href";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceRowDetails, PiecesMobileList } from "./PiecesMobileList";

// The dialogs, popovers and step actions import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/people", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("@/app/actions/setlists", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// The Files and Links read Edit mode themselves; it follows the list's `isEditing`.
let editMode = false;
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: true, isEditing: editMode, setIsEditing: vi.fn() }),
}));

const piece = {
  id: "piece-1",
  slug: "vem-kan-segla",
  name: "Vem kan segla",
  credits: [],
  files: [
    { id: "file-1", slug: "file-1", displayName: "Sopran.pdf", fileName: "Sopran.pdf", size: 1024, category: null },
    { id: "file-2", slug: "file-2", displayName: "Alt.pdf", fileName: "Alt.pdf", size: 1024, category: null },
  ],
  links: [{ id: "link-1", url: "https://example.com/inspelning", label: "Inspelning", category: null }],
  aliases: [],
  notes: [],
} as unknown as PieceWithRelations;

const notes = [
  { id: "note-1", content: "Nyast\nmed radbrytning" },
  { id: "note-2", content: "Äldst" },
];

/** The list in read mode, of Alla noter (`pieces`) or a set list's running order (`setList`). */
function renderList(
  rows: { pieces: PieceWithRelations[] } | { setList: { id: string; steps: SetListStep[] } },
): string {
  return renderMarkup(
    createElement(PiecesMobileList, {
      people: [],
      creditRoles: [],
      groupSlug: "koren",
      isEditing: false,
      showsStepActions: false,
      emptyMessage: "",
      ...rows,
    }),
  );
}

describe("PiecesMobileList", () => {
  it("shows a closed piece row by its name alone, without its Files, Links or counts of them", () => {
    const text = textOf(renderList({ pieces: [piece] }));

    expect(text).toContain("Vem kan segla");
    expect(text).not.toMatch(/Sopran\.pdf|Inspelning|Detaljsida|\d (fil|filer|länk|länkar)\b/);
  });
});

describe("PiecesMobileList letter dividers", () => {
  const names = ["1700-tal", "Abendlied", "Ave verum", "Bred dina vida vingar", "Änglamark", "Över berg och dal"];

  function namedPiece(name: string): PieceWithRelations {
    return { ...piece, id: name, name } as unknown as PieceWithRelations;
  }

  /** The letter dividers and piece names in `html`, in the order shown. */
  function shownSequence(html: string): string[] {
    return [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>|>([^<]+)</g)]
      .filter(([, divider, text]) => divider !== undefined || names.includes(text))
      .map(([, divider, text]) => divider ?? text);
  }

  it("shows Alla noter as given, with a heading before the first piece of each letter group", () => {
    const html = renderList({ pieces: names.map(namedPiece) });

    expect(shownSequence(html)).toEqual([
      "#",
      "1700-tal",
      "A",
      "Abendlied",
      "Ave verum",
      "B",
      "Bred dina vida vingar",
      "Ä",
      "Änglamark",
      "Ö",
      "Över berg och dal",
    ]);
  });

  it("shows no dividers in a set list's running order", () => {
    const steps = ["Över berg och dal", "Abendlied"].map((name, position) => ({
      kind: "piece",
      id: `step-${position}`,
      position,
      piece: namedPiece(name),
    })) as unknown as SetListStep[];
    const html = renderList({ setList: { id: "setlist-1", steps } });

    expect(shownSequence(html)).toEqual(["Över berg och dal", "Abendlied"]);
  });
});

describe("PieceRowDetails, an open piece row", () => {
  function renderDetails(
    isEditing: boolean,
    overrides: Partial<PieceWithRelations> = {},
    setListId?: string,
    setListPieceId?: string,
  ): string {
    editMode = isEditing;
    return renderMarkup(
      createElement(PieceRowDetails, {
        piece: { ...piece, ...overrides } as PieceWithRelations,
        people: [],
        creditRoles: [],
        groupSlug: "koren",
        isEditing,
        setListId,
        setListPiece: setListPieceId ? { id: setListPieceId, hiddenFileIds: [], hiddenLinkIds: [] } : undefined,
      }),
    );
  }

  describe("in read mode", () => {
    it("lists the piece's notes under an Anteckningar heading, after Files and Links", () => {
      expect(textOf(renderDetails(false, { notes }))).toMatch(/Inspelning.*Anteckningar.*Nyast med radbrytning.*Äldst/);
    });

    it("hides the Anteckningar section for a piece without notes", () => {
      expect(textOf(renderDetails(false))).not.toContain("Anteckningar");
    });

    it("keeps saying there are no files or links, also when there are notes", () => {
      const text = textOf(renderDetails(false, { files: [], links: [], notes }));

      expect(text).toMatch(/Inga filer eller länkar\..*Anteckningar.*Nyast/);
    });

    it("has no way to open the notes dialog", () => {
      const text = textOf(renderDetails(false, { notes }));

      expect(text).not.toContain("Redigera anteckningar");
      expect(text).not.toContain("Lägg till anteckning");
    });
  });

  describe("in edit mode", () => {
    it("lists the notes after the Files and Links with a trigger to edit them", () => {
      const text = textOf(renderDetails(true, { notes }));

      expect(text).toMatch(
        /Filer och länkar.*Inspelning.*Anteckningar.*Nyast med radbrytning.*Äldst.*Redigera anteckningar/,
      );
    });

    it("shows the Anteckningar section with an add trigger for a piece without notes", () => {
      const text = textOf(renderDetails(true));

      expect(text).toMatch(/Anteckningar.*Lägg till anteckning/);
    });

    it("has no Redigera button", () => {
      expect(renderDetails(true)).not.toMatch(/>Redigera</);
    });

    it("starts with a Namn section that offers to rename the piece", () => {
      const html = renderDetails(true);

      expect(textOf(html)).toMatch(/^Namn\s*Vem kan segla\s*Upphovspersoner/);
      expect(html).toContain('aria-label="Byt namn på Vem kan segla"');
    });

    it("lets a Person's Credits be removed", () => {
      const html = renderDetails(true, {
        credits: [{ personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } }],
      } as unknown as Partial<PieceWithRelations>);

      expect(html).toContain('aria-label="Ta bort Anna Andersson"');
    });
  });

  it("in the running order, reads like a Piece with no Files or Links when its Set list piece hides them all", () => {
    const html = renderMarkup(
      createElement(PieceRowDetails, {
        piece: { ...piece, files: [piece.files[0]] },
        people: [],
        creditRoles: [],
        groupSlug: "koren",
        isEditing: false,
        setListId: "setlist-1",
        setListPiece: { id: "step-1", hiddenFileIds: ["file-1"], hiddenLinkIds: ["link-1"] },
      }),
    );

    expect(textOf(html)).toContain("Inga filer eller länkar.");
    expect(textOf(html)).not.toContain("Sopran.pdf");
    expect(textOf(html)).not.toContain("Inspelning");
  });

  it("in the running order, opens a Playable File in the player for its Set list piece", () => {
    const sopran = {
      id: "file-1",
      slug: "file-1",
      displayName: "Sopran.mp3",
      fileName: "Sopran.mp3",
      size: 1024,
      category: null,
    };
    const html = renderDetails(false, { files: [sopran] } as Partial<PieceWithRelations>, "setlist-1", "step-1");

    expect(html).toContain(
      `href="${playerHref("koren", piece, { slug: "file-1" }, { fromSetListPieceId: "step-1" })}"`,
    );
  });

  it.each([
    ["Alla noter", undefined, undefined],
    ["running order", "setlist-1", "step-1"],
  ])("in the %s, links to the piece's detail page as Detaljsida", (_, setListId, setListPieceId) => {
    const html = renderDetails(false, {}, setListId, setListPieceId);
    const href = pieceHref("koren", piece, { fromSetListPieceId: setListPieceId }).replace("?", "\\?");

    expect(html).toMatch(new RegExp(`<a[^>]*href="${href}"[^>]*>Detaljsida<`));
  });
});
