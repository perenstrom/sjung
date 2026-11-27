import { describe, expect, it } from "vitest";
import { heldClaims } from "./group-roles";

const roles = [
  { id: "r1", name: "Stämledare", claims: ["MANAGE_CONTENT" as const, "REORDER_SET_LISTS" as const] },
  { id: "r2", name: "Notansvarig", claims: ["MANAGE_CONTENT" as const] },
  { id: "r3", name: "Ohållen", claims: ["MANAGE_MEMBERS" as const] },
];

describe("heldClaims", () => {
  it("lists each Claim the Member holds once, in display order, with where it comes from", () => {
    expect(heldClaims({ claims: ["MANAGE_CONTENT", "MANAGE_GROUP_HOME"], roleIds: ["r1", "r2"] }, roles)).toEqual([
      { claim: "MANAGE_CONTENT", label: "Hantera innehåll", individual: true, viaRoles: ["Stämledare", "Notansvarig"] },
      { claim: "REORDER_SET_LISTS", label: "Ändra ordning i repertoarer", individual: false, viaRoles: ["Stämledare"] },
      { claim: "MANAGE_GROUP_HOME", label: "Hantera startsidan", individual: true, viaRoles: [] },
    ]);
  });
});
