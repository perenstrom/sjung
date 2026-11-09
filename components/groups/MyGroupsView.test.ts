import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

function render(groups: MyGroupsTableRow[]): string {
  return renderToStaticMarkup(createElement(MyGroupsView, { groups }));
}

function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, "");
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

    it("offers creating a group once, from the empty state", () => {
      expect(countOccurrences(html, "Skapa ny grupp")).toBe(1);
      expect(html).toMatch(/data-slot="empty-state"[\s\S]*Skapa ny grupp/);
    });
  });

  describe("with groups", () => {
    const html = render([
      { id: "g1", name: "Kammarkören", slug: "kammarkoren", isCreator: true, canManageMembers: true },
    ]);

    it("lists the groups without the empty state", () => {
      expect(html).toContain("Kammarkören");
      expect(html).toContain("<table");
      expect(html).not.toContain(EMPTY_HEADING);
      expect(html).not.toContain('data-slot="empty-state"');
    });

    it("offers creating a group from the page header", () => {
      expect(countOccurrences(html, "Skapa ny grupp")).toBe(1);
    });
  });
});
