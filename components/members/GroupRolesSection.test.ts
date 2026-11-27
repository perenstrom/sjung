import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import type { GroupRoleRow } from "@/app/actions/group-roles";
import { deleteRoleConsequence } from "./DeleteGroupRoleDialog";
import { GroupRolesSection } from "./GroupRolesSection";

// The Role dialogs import server actions, which reach the database.
vi.mock("@/app/actions/group-roles", () => ({
  createGroupRole: vi.fn(),
  updateGroupRole: vi.fn(),
  deleteGroupRole: vi.fn(),
}));

const ROLES: GroupRoleRow[] = [
  { id: "r1", name: "Notansvarig", claims: ["MANAGE_CONTENT"], holderCount: 0, canChange: true },
  { id: "r2", name: "Stämledare", claims: [], holderCount: 3, canChange: false },
];

function render(canManageRoles: boolean): string {
  return renderMarkup(createElement(GroupRolesSection, { groupSlug: "kor", roles: ROLES, canManageRoles }));
}

/** The `<button>` tags with this aria-label, as rendered (twice: mobile list and table). */
function buttons(html: string, label: string): string[] {
  return html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`, "g")) ?? [];
}

describe("GroupRolesSection", () => {
  it("lists each Role with its Claims and holders", () => {
    const text = textOf(render(false));

    expect(text).toContain("Notansvarig");
    expect(text).toContain("Hantera innehåll");
    expect(text).toContain("Inga behörigheter");
    expect(text).toContain("3 medlemmar");
  });

  it("gives a viewer who may not manage Roles no controls", () => {
    const html = render(false);

    expect(textOf(html)).not.toContain("Ny roll");
    expect(buttons(html, "Redigera Notansvarig")).toEqual([]);
    expect(buttons(html, "Ta bort Notansvarig")).toEqual([]);
  });

  it("disables the controls on a Role the viewer holds", () => {
    const html = render(true);

    expect(textOf(html)).toContain("Ny roll");
    const isDisabled = (tag: string) => / disabled=""/.test(tag);
    for (const label of ["Redigera", "Ta bort"]) {
      expect(buttons(html, `${label} Notansvarig`).map(isDisabled)).toEqual([false, false]);
      expect(buttons(html, `${label} Stämledare`).map(isDisabled)).toEqual([true, true]);
    }
  });
});

describe("deleteRoleConsequence", () => {
  it.each([
    [0, "Ingen medlem har rollen."],
    [1, "1 medlem har rollen och förlorar de behörigheter de bara har genom den."],
    [4, "4 medlemmar har rollen och förlorar de behörigheter de bara har genom den."],
  ])("names the number of holders: %i", (count, sentence) => {
    expect(deleteRoleConsequence(count)).toBe(sentence);
  });
});
