import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderMarkup } from "@/lib/testing/markup";
import { GroupMembersTable, type GroupMembersTableRow } from "./GroupMembersTable";

// The Claims and remove dialogs import server actions, which reach the database.
vi.mock("@/app/actions/groups", () => ({
  setMemberClaims: vi.fn(),
  removeMemberFromGroup: vi.fn(),
}));

function render(flags: Pick<GroupMembersTableRow, "canRemove" | "canChangeClaims">): string {
  const member: GroupMembersTableRow = {
    id: "u1",
    name: "Anna",
    email: "anna@example.com",
    isCreator: false,
    claims: [],
    ...flags,
  };
  return renderMarkup(createElement(GroupMembersTable, { groupSlug: "kor", members: [member] }));
}

const CLAIMS_BUTTON = 'aria-label="Behörigheter för Anna"';
const REMOVE_BUTTON = 'aria-label="Ta bort Anna"';

describe("GroupMembersTable", () => {
  // Rendered once in the mobile list and once in the table.
  it.each([
    [{ canRemove: true, canChangeClaims: true }, 2, 2],
    [{ canRemove: true, canChangeClaims: false }, 0, 2],
    [{ canRemove: false, canChangeClaims: true }, 2, 0],
    [{ canRemove: false, canChangeClaims: false }, 0, 0],
  ])("shows a Member's actions only for what the viewer may do: %o", (flags, claimsButtons, removeButtons) => {
    const html = render(flags);

    expect(html.split(CLAIMS_BUTTON).length - 1).toBe(claimsButtons);
    expect(html.split(REMOVE_BUTTON).length - 1).toBe(removeButtons);
  });
});
