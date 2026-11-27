import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { GroupMembersTable, type GroupMembersTableRow } from "./GroupMembersTable";

// The Claims, Roles and remove dialogs import server actions, which reach the database.
vi.mock("@/app/actions/groups", () => ({
  setMemberClaims: vi.fn(),
  removeMemberFromGroup: vi.fn(),
}));
vi.mock("@/app/actions/group-roles", () => ({
  setMemberRoles: vi.fn(),
}));

const ROLES = [{ id: "r1", name: "Stämledare", claims: ["MANAGE_CONTENT" as const, "REORDER_SET_LISTS" as const] }];

function render(overrides: Partial<GroupMembersTableRow>): string {
  const member: GroupMembersTableRow = {
    id: "u1",
    name: "Anna",
    email: "anna@example.com",
    isCreator: false,
    canRemove: false,
    canChangeClaims: false,
    canChangeRoles: false,
    claims: [],
    roleIds: [],
    ...overrides,
  };
  return renderMarkup(createElement(GroupMembersTable, { groupSlug: "kor", members: [member], roles: ROLES }));
}

const CLAIMS_BUTTON = 'aria-label="Behörigheter för Anna"';
const ROLES_BUTTON = 'aria-label="Roller för Anna"';
const REMOVE_BUTTON = 'aria-label="Ta bort Anna"';

describe("GroupMembersTable", () => {
  // Rendered once in the mobile list and once in the table.
  it.each([
    [{ canRemove: true, canChangeClaims: true, canChangeRoles: true }, 2, 2, 2],
    [{ canRemove: true, canChangeClaims: false, canChangeRoles: false }, 0, 0, 2],
    [{ canRemove: false, canChangeClaims: true, canChangeRoles: true }, 2, 2, 0],
    [{ canRemove: false, canChangeClaims: false, canChangeRoles: false }, 0, 0, 0],
  ])(
    "shows a Member's actions only for what the viewer may do: %o",
    (flags, claimsButtons, rolesButtons, removeButtons) => {
      const html = render(flags);

      expect(html.split(CLAIMS_BUTTON).length - 1).toBe(claimsButtons);
      expect(html.split(ROLES_BUTTON).length - 1).toBe(rolesButtons);
      expect(html.split(REMOVE_BUTTON).length - 1).toBe(removeButtons);
    },
  );

  it("shows the Member's Roles and where each Claim comes from", () => {
    const text = textOf(render({ claims: ["MANAGE_CONTENT", "MANAGE_GROUP_HOME"], roleIds: ["r1"] }));

    expect(text).toContain("Roller: Stämledare");
    expect(text).toContain("Ändra ordning i repertoarer via Stämledare");
    // Held individually as well, so shown without a Role.
    expect(text).toContain("Hantera innehåll");
    expect(text).not.toContain("Hantera innehåll via");
  });
});
