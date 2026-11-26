import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { MyGroupsView } from "./MyGroupsView";
import type { MyGroupsTableRow } from "./MyGroupsTable";

// The create, edit and delete dialogs import server actions, which reach the database.
vi.mock("@/app/actions/groups", () => ({
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

const EMPTY_HEADING = "Du är inte med i någon grupp än";
const EMPTY_BODY =
  "När någon bjuder in dig till en grupp får du en inbjudan via e-post. Följ länken i mejlet för att gå med.";
const START_OWN = "Vill du starta en egen grupp?";

function render(groups: MyGroupsTableRow[]): string {
  return renderMarkup(createElement(MyGroupsView, { groups }));
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("MyGroupsView", () => {
  it("is headed Mina grupper", () => {
    expect(render([])).toContain(">Mina grupper</h1>");
  });

  describe("without groups", () => {
    const html = render([]);

    it("shows the empty state instead of a list or table", () => {
      expect(html).toContain(EMPTY_HEADING);
      expect(textOf(html)).toContain(EMPTY_BODY);
      expect(html).not.toContain("<table");
      expect(html).not.toContain('data-slot="mobile-list"');
    });

    it("offers starting a group only as a link below the invitation guidance", () => {
      expect(html).not.toContain("Skapa ny grupp");
      expect(countOccurrences(html, START_OWN)).toBe(1);
      expect(textOf(html).indexOf(EMPTY_BODY)).toBeLessThan(textOf(html).indexOf(START_OWN));
    });
  });

  describe("with groups", () => {
    const html = render([
      { id: "g1", name: "Kammarkören", slug: "kammarkoren", canViewMembers: true, canManageGroup: true },
    ]);

    it("lists the groups without the empty state", () => {
      expect(html).toContain("Kammarkören");
      expect(html).toContain("<table");
      expect(html).not.toContain(EMPTY_HEADING);
      expect(html).not.toContain('data-slot="empty-state"');
    });

    it("offers starting a group only as a link below the table, not in the header", () => {
      expect(html).not.toContain("Skapa ny grupp");
      expect(countOccurrences(html, START_OWN)).toBe(1);
      expect(textOf(html).indexOf("Kammarkören")).toBeLessThan(textOf(html).indexOf(START_OWN));
    });
  });
});
