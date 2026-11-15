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

// The order the database may return: Ä among A, digits last.
const unsortedNames = [
  "Abendlied",
  "Änglamark",
  "Ave verum",
  "Bred dina vida vingar",
  "Över berg och dal",
  "1700-tal",
];

function namedPiece(name: string): PieceWithRelations {
  return { ...piece, id: name, name, credits: [] } as unknown as PieceWithRelations;
}

/** The letter dividers and the given piece names in `html`, in the order shown. */
function shownSequence(html: string, names: string[]): string[] {
  const dividers = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((match) => ({
    index: match.index,
    text: match[1],
  }));
  const pieces = [...html.matchAll(/>([^<]+)</g)]
    .filter((match) => names.includes(match[1]))
    .map((match) => ({ index: match.index, text: match[1] }));
  return [...dividers, ...pieces].sort((a, b) => a.index - b.index).map(({ text }) => text);
}

function desktopTable(html: string): string {
  return html.slice(html.indexOf("<table"));
}

function mobileList(html: string): string {
  return html.slice(0, html.indexOf("<table"));
}

describe("PiecesTable letter dividers", () => {
  describe.each([
    ["edit", true],
    ["read", false],
  ])("in %s mode", (_, isEditing) => {
    beforeEach(() => {
      editMode.isEditing = isEditing;
    });

    it.each([
      ["desktop table", desktopTable],
      ["mobile list", mobileList],
    ])("sorts Alla noter in Swedish order with a divider before each letter group in the %s", (_, part) => {
      const html = renderMarkup(
        createElement(PiecesTable, {
          people: [],
          groupSlug: "koren",
          pieces: unsortedNames.map(namedPiece),
        }),
      );

      expect(shownSequence(part(html), unsortedNames)).toEqual([
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

    it("renders a divider as a full-width heading row", () => {
      const html = desktopTable(
        renderMarkup(
          createElement(PiecesTable, { people: [], groupSlug: "koren", pieces: [piece] }),
        ),
      );
      const columnCount = html.match(/<th[\s>]/g)?.length;

      expect(html).toMatch(new RegExp(`<td[^>]*colSpan="${columnCount}"[^>]*><h2[^>]*>V</h2>`));
    });

    it("shows no dividers in a set list and keeps its running order", () => {
      const steps = ["Över berg och dal", "Abendlied"].map((name, position) => ({
        kind: "piece",
        id: `step-${position}`,
        position,
        piece: namedPiece(name),
      })) as unknown as SetListStep[];
      const html = renderMarkup(
        createElement(PiecesTable, {
          people: [],
          groupSlug: "koren",
          setList: { id: "setlist-1", steps },
        }),
      );

      expect(html).not.toContain("<h2");
      expect(shownSequence(desktopTable(html), unsortedNames)).toEqual([
        "Över berg och dal",
        "Abendlied",
      ]);
    });

    it("shows no dividers when there are no pieces", () => {
      const html = renderMarkup(
        createElement(PiecesTable, { people: [], groupSlug: "koren", pieces: [] }),
      );

      expect(html).not.toContain("<h2");
      expect(textOf(html)).toContain("Inga noter tillagda ännu.");
    });
  });
});

describe.each([
  ["Noter", renderPieces],
  ["set list", renderSetList],
])("PiecesTable for %s", (_, render) => {
  describe.each([
    ["edit", true],
    ["read", false],
  ])("in %s mode", (_, isEditing) => {
    beforeEach(() => {
      editMode.isEditing = isEditing;
    });

    it("caps Medverkande at the width of the other list columns and lets it wrap", () => {
      const cell = render()
        .split("<td")
        .slice(1)
        .find((td) => td.includes("Anna Andersson"));
      const contentClasses = cell?.match(/^[^>]*>\s*<div class="([^"]*)"/)?.[1].split(" ");

      expect(contentClasses).toEqual(
        expect.arrayContaining(["min-w-56", "max-w-xs", "whitespace-normal"]),
      );
    });
  });

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
