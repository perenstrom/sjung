import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { pieceHref } from "@/lib/pieces/href";
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
  name: "Vem kan segla",
  credits: [],
  files: [
    { id: "file-1", displayName: "Sopran.pdf", fileName: "Sopran.pdf", size: 1024, category: null },
    { id: "file-2", displayName: "Alt.pdf", fileName: "Alt.pdf", size: 1024, category: null },
  ],
  links: [{ id: "link-1", url: "https://example.com/inspelning", label: "Inspelning", category: null }],
  aliases: [],
  notes: [],
} as unknown as PieceWithRelations;

const notes = [
  { id: "note-1", content: "Nyast\nmed radbrytning" },
  { id: "note-2", content: "Äldst" },
];

function renderPieces(isEditing: boolean): string {
  editMode = isEditing;
  return renderMarkup(
    createElement(PiecesMobileList, { people: [], creditRoles: [], groupSlug: "koren", isEditing, emptyMessage: "", pieces: [piece] }),
  );
}

function renderSetList(isEditing: boolean): string {
  editMode = isEditing;
  const steps = [{ kind: "piece", id: "step-1", position: 0, piece }] as unknown as SetListStep[];
  return renderMarkup(
    createElement(PiecesMobileList, {
      people: [], creditRoles: [],
      groupSlug: "koren",
      isEditing,
      emptyMessage: "",
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
      // The chevron is the row's only icon.
      expect(html.split("<svg").length - 1).toBe(1);
      expect(textOf(html)).not.toMatch(/\d (fil|filer|länk|länkar)\b/);
    });
  });
});

describe("PiecesMobileList letter dividers", () => {
  function namedPiece(name: string): PieceWithRelations {
    return { ...piece, id: name, name } as unknown as PieceWithRelations;
  }

  /** The letter dividers and piece names in `html`, in the order shown. */
  function shownSequence(html: string): string[] {
    return [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>|<span class="font-medium">([^<]*)<\/span>/g)].map(
      (match) => match[1] ?? match[2],
    );
  }

  describe.each([
    ["read", false],
    ["edit", true],
  ])("in %s mode", (_, isEditing) => {
    it("shows Alla noter as given, with a heading before the first piece of each letter group", () => {
      const html = renderMarkup(
        createElement(PiecesMobileList, {
          people: [], creditRoles: [],
          groupSlug: "koren",
          isEditing,
          emptyMessage: "",
          pieces: ["1700-tal", "Abendlied", "Ave verum", "Bred dina vida vingar", "Änglamark", "Över berg och dal"].map(
            namedPiece,
          ),
        }),
      );

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
      const html = renderMarkup(
        createElement(PiecesMobileList, {
          people: [], creditRoles: [],
          groupSlug: "koren",
          isEditing,
          emptyMessage: "",
          setList: { id: "setlist-1", steps },
        }),
      );

      expect(shownSequence(html)).toEqual(["Över berg och dal", "Abendlied"]);
    });
  });
});

describe("PieceRowDetails, an open piece row", () => {
  function renderDetails(
    isEditing: boolean,
    overrides: Partial<PieceWithRelations> = {},
    setListId?: string,
  ): string {
    editMode = isEditing;
    return renderMarkup(
      createElement(PieceRowDetails, {
        piece: { ...piece, ...overrides } as PieceWithRelations,
        people: [], creditRoles: [],
        groupSlug: "koren",
        isEditing,
        setListId,
      }),
    );
  }

  describe.each([
    ["read", false],
    ["edit", true],
  ])("with a Category in %s mode", (_, isEditing) => {
    it("groups the Files and Links under their Category headings, Övrigt last", () => {
      const text = textOf(
        renderDetails(isEditing, {
          files: [
            { id: "file-1", displayName: "Sopran.pdf", fileName: "Sopran.pdf", size: 1024, category: null },
            { id: "file-2", displayName: "Alt.pdf", fileName: "Alt.pdf", size: 1024, category: "Noter" },
          ],
          links: [{ id: "link-1", url: "https://example.com/inspelning", label: "Inspelning", category: "Noter" }],
        } as unknown as Partial<PieceWithRelations>),
      );

      expect(text).toMatch(/Noter.*Alt\.pdf.*Inspelning.*Övrigt.*Sopran\.pdf/);
    });
  });

  describe("in read mode", () => {
    it("lists the piece's notes under an Anteckningar heading, after Files and Links", () => {
      const html = renderDetails(false, { notes });
      const text = textOf(html);

      expect(text).toMatch(/Inspelning.*Anteckningar.*Nyast med radbrytning.*Äldst/);
      expect(html).toContain("<h3");
    });

    it("hides the Anteckningar section for a piece without notes", () => {
      expect(textOf(renderDetails(false))).not.toContain("Anteckningar");
    });

    it("keeps saying there are no files or links, also when there are notes", () => {
      const text = textOf(
        renderDetails(false, { files: [], links: [], notes }),
      );

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

      expect(text).toMatch(/Filer och länkar.*Inspelning.*Anteckningar.*Nyast med radbrytning.*Äldst.*Redigera anteckningar/);
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
        credits: [
          { personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } },
        ],
      } as unknown as Partial<PieceWithRelations>);

      expect(html).toContain('aria-label="Ta bort Anna Andersson"');
    });
  });

  describe.each([
    ["Noter, read mode", false, undefined],
    ["Noter, edit mode", true, undefined],
    ["running order, read mode", false, "setlist-1"],
    ["running order, edit mode", true, "setlist-1"],
  ])("in the %s", (_, isEditing, setListId) => {
    const html = renderDetails(isEditing, {}, setListId);
    const href = pieceHref("koren", "piece-1", { fromSetListId: setListId }).replace("?", "\\?");

    it("links to the piece's detail page as Detaljsida with a hidden chevron", () => {
      expect(textOf(html)).not.toContain("Öppna stycket");
      expect(html).toMatch(
        new RegExp(`<a[^>]*href="${href}"[^>]*>Detaljsida<svg[^>]*aria-hidden="true"[^>]*>.*?</svg></a>`),
      );
    });
  });
});
