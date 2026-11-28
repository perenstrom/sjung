import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { playerHref } from "@/lib/pieces/href";
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

// What PiecesTable adds over PiecesMobileList (tested on its own) is the
// desktop table, and the sorted, searched pieces and empty message it passes
// both. The search, letter-group and Category rules are tested in lib/pieces.

const piece = {
  id: "piece-1",
  slug: "vem-kan-segla",
  name: "Vem kan segla",
  credits: [
    { personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } },
    { personId: "person-1", role: "Textförfattare", person: { name: "Anna Andersson" } },
  ],
  aliases: [],
  files: [],
  links: [],
  notes: [],
} as unknown as PieceWithRelations;

function namedPiece(name: string, overrides: Partial<PieceWithRelations> = {}): PieceWithRelations {
  return { ...piece, id: name, name, credits: [], ...overrides } as unknown as PieceWithRelations;
}

function renderPieces(pieces: PieceWithRelations[], search?: string): string {
  return renderMarkup(createElement(PiecesTable, { people: [], creditRoles: [], groupSlug: "koren", pieces, search }));
}

function renderSetList(stepPieces: PieceWithRelations[]): string {
  const steps = stepPieces.map((stepPiece, position) => ({
    kind: "piece",
    id: `step-${position + 1}`,
    position,
    piece: stepPiece,
    hiddenFileIds: [],
    hiddenLinkIds: [],
  })) as unknown as SetListStep[];
  return renderMarkup(
    createElement(PiecesTable, {
      people: [],
      creditRoles: [],
      groupSlug: "koren",
      setList: { id: "setlist-1", steps },
    }),
  );
}

function desktopTable(html: string): string {
  return html.slice(html.indexOf("<table"));
}

function mobileList(html: string): string {
  return html.slice(0, html.indexOf("<table"));
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

// The order the database may return: Ä among A, digits last.
const unsortedNames = ["Abendlied", "Änglamark", "Ave verum", "Bred dina vida vingar", "Över berg och dal", "1700-tal"];

beforeEach(() => {
  editMode.isEditing = false;
});

describe("PiecesTable on Alla noter", () => {
  it("sorts the pieces in Swedish order with a divider before each letter group", () => {
    const html = desktopTable(renderPieces(unsortedNames.map((name) => namedPiece(name))));

    expect(shownSequence(html, unsortedNames)).toEqual([
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

  it("heads the Credits column Upphovspersoner", () => {
    expect(textOf(desktopTable(renderPieces([piece])))).toContain("Upphovspersoner");
  });

  it.each([
    ["rename the piece", 'aria-label="Byt namn på Vem kan segla"'],
    ["remove a Person's Credits", 'aria-label="Ta bort Anna Andersson"'],
    ["remove one Credit role", 'aria-label="Ta bort rollen Kompositör från Anna Andersson"'],
  ])("offers to %s in edit mode only", (_, control) => {
    editMode.isEditing = true;
    expect(desktopTable(renderPieces([piece]))).toContain(control);

    editMode.isEditing = false;
    expect(desktopTable(renderPieces([piece]))).not.toContain(control);
  });

  it("has no Redigera button in edit mode", () => {
    editMode.isEditing = true;

    expect(desktopTable(renderPieces([piece]))).not.toMatch(/>Redigera</);
  });
});

describe("PiecesTable search on Alla noter", () => {
  const pieces = [
    ...unsortedNames.map((name) => namedPiece(name)),
    namedPiece("Pavane"),
    namedPiece("O helga natt", {
      aliases: ["Julsången", "Cantique de Noël"].map((name) => ({ id: name, name })),
    } as Partial<PieceWithRelations>),
    namedPiece("Cantique de Jean Racine"),
  ];
  const names = pieces.map(({ name }) => name);

  it.each([
    ["desktop table", desktopTable],
    ["mobile list", mobileList],
  ])(
    "shows only the matching pieces, sorted under their letters, with the Aliases that matched, in the %s",
    (_, part) => {
      const html = part(renderPieces(pieces, "an"));

      expect(shownSequence(html, names)).toEqual(["C", "Cantique de Jean Racine", "O", "O helga natt", "P", "Pavane"]);
      expect(textOf(html)).toContain("Även kallad Cantique de Noël");
    },
  );

  it("finds a piece by a credited Person", () => {
    const credited = namedPiece("Pavane", {
      credits: [{ personId: "person-2", role: "Kompositör", person: { name: "Gabriel Fauré" } }],
    } as unknown as Partial<PieceWithRelations>);

    expect(shownSequence(desktopTable(renderPieces([...pieces, credited], "faure")), names)).toEqual(["P", "Pavane"]);
  });

  it("shows no Aliases for a piece whose name matches", () => {
    expect(textOf(renderPieces(pieces, "helga"))).not.toContain("Även kallad");
  });
});

describe("PiecesTable empty message", () => {
  it.each([
    ["a Group without pieces", () => renderPieces([], ""), "Inga noter tillagda ännu."],
    ["a search that matches nothing", () => renderPieces([piece], "  zzz "), 'Inga stycken matchar "zzz"'],
    ["a set list without steps", () => renderSetList([]), "Inga steg i repertoaren ännu."],
  ])("for %s, in both the desktop table and the mobile list", (_, render, message) => {
    const html = render();

    expect(textOf(desktopTable(html))).toContain(message);
    expect(textOf(mobileList(html))).toContain(message);
  });
});

describe("PiecesTable for a set list", () => {
  it("keeps the running order, without letter dividers", () => {
    const html = desktopTable(renderSetList(["Över berg och dal", "Abendlied"].map((name) => namedPiece(name))));

    expect(shownSequence(html, unsortedNames)).toEqual(["Över berg och dal", "Abendlied"]);
  });

  it("opens a Playable File in the player for the row's Set list piece", () => {
    const sopran = {
      id: "file-1",
      slug: "file-1",
      displayName: "Sopran.mp3",
      size: 1024,
      category: null,
      mimeType: "audio/mpeg",
      fileName: "Sopran.mp3",
    };
    const html = desktopTable(renderSetList([{ ...piece, files: [sopran] } as unknown as PieceWithRelations]));

    expect(html).toContain(
      `href="${playerHref("koren", piece, { slug: "file-1" }, { fromSetListPieceId: "step-1" })}"`,
    );
  });
});
