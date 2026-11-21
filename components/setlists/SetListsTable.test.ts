import { createElement } from "react";
import type { SortingState } from "@tanstack/react-table";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "@/components/data-table";
import { compareSetListsByDefault } from "@/lib/setlists/sorting";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { SetListsTable, type SetListsTableRow, setListsColumns } from "./SetListsTable";

// The edit and delete dialogs import server actions, which reach the database.
vi.mock("@/app/actions/setlists", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const editMode = vi.hoisted(() => ({ isEditing: false }));
vi.mock("@/components/EditModeContext", () => ({
  useEditMode: () => ({ canEdit: true, isEditing: editMode.isEditing, setIsEditing: vi.fn() }),
}));

function setList(name: string, isoDate: string | null, current = false): SetListsTableRow {
  return {
    id: name,
    name,
    date: isoDate ? new Date(isoDate) : null,
    current,
    dateLabel: isoDate,
  };
}

// The order the database may return: most recently updated first.
const setLists = [
  setList("Utan datum", null),
  setList("Vårkonsert", "2026-05-01", true),
  setList("Öppet hus", "2026-12-13"),
  setList("Lucia", "2026-12-13"),
  setList("Julkonsert", "2026-12-20"),
];
const names = setLists.map(({ name }) => name);

/** The given Set list names in `html`, in the order shown. */
function shownNames(html: string): string[] {
  return [...html.matchAll(/>([^<]+)</g)]
    .map((match) => match[1])
    .filter((text) => names.includes(text));
}

function desktopTable(html: string): string {
  return html.slice(html.indexOf("<table"));
}

function mobileList(html: string): string {
  return html.slice(0, html.indexOf("<table"));
}

describe("SetListsTable", () => {
  beforeEach(() => {
    editMode.isEditing = false;
  });

  // The order rule itself is covered in lib/setlists/sorting.test.ts; this
  // checks that both views start in it.
  it.each([
    ["desktop table", desktopTable],
    ["mobile list", mobileList],
  ])("shows Current Set lists first, badged Aktuell, then the rest in the %s", (_, part) => {
    const html = part(renderMarkup(createElement(SetListsTable, { setLists, groupSlug: "koren" })));

    expect(shownNames(html)).toEqual([
      "Vårkonsert",
      "Julkonsert",
      "Lucia",
      "Öppet hus",
      "Utan datum",
    ]);
    expect(textOf(html).match(/Aktuell/g)).toHaveLength(1);
    expect(textOf(html)).toMatch(/Vårkonsert\s*Aktuell/);
  });

  describe.each([
    ["edit", true],
    ["read", false],
  ])("in %s mode", (_, isEditing) => {
    beforeEach(() => {
      editMode.isEditing = isEditing;
    });

    it("shows the empty state", () => {
      const html = renderMarkup(createElement(SetListsTable, { setLists: [], groupSlug: "koren" }));

      expect(textOf(desktopTable(html))).toContain("Inga repertoarer tillagda ännu.");
      expect(textOf(mobileList(html))).toContain("Inga repertoarer tillagda ännu.");
    });
  });

  it("lets Namn and Datum be sorted, but not Åtgärder", () => {
    editMode.isEditing = true;
    const headers = desktopTable(
      renderMarkup(createElement(SetListsTable, { setLists, groupSlug: "koren" }))
    );
    const headerCells = [...headers.matchAll(/<th[^>]*>(.*?)<\/th>/g)].map((match) => match[1]);

    expect(headerCells.map((cell) => [textOf(cell), cell.includes("<button")])).toEqual([
      ["Namn", true],
      ["Datum", true],
      ["Åtgärder", false],
    ]);
  });

  it.each<[string, SortingState, string[]]>([
    [
      "name ascending, in Swedish order",
      [{ id: "name", desc: false }],
      ["Julkonsert", "Lucia", "Utan datum", "Vårkonsert", "Öppet hus"],
    ],
    [
      "date ascending, keeping undated last",
      [{ id: "date", desc: false }],
      ["Vårkonsert", "Lucia", "Öppet hus", "Julkonsert", "Utan datum"],
    ],
  ])("sorts by %s when its heading is chosen, with Current Set lists not pinned first", (_, sorting, expected) => {
    const html = renderMarkup(
      createElement(DataTable<SetListsTableRow>, {
        columns: setListsColumns("koren", false),
        // SetListsTable hands the table its rows in the default order, which settles ties.
        data: [...setLists].sort(compareSetListsByDefault),
        initialSorting: sorting,
      })
    );

    expect(shownNames(html)).toEqual(expected);
  });
});
