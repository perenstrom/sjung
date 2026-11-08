import { describe, expect, it } from "vitest";
import { canChangeMember, myGroupActions } from "./groups";

describe("canChangeMember", () => {
  it("allows changing another plain member", () => {
    expect(canChangeMember({ id: "u2", isCreator: false }, "u1")).toBe(true);
  });

  it("refuses the Creator", () => {
    expect(canChangeMember({ id: "u2", isCreator: true }, "u1")).toBe(false);
  });

  it("refuses the viewer's own membership", () => {
    expect(canChangeMember({ id: "u1", isCreator: false }, "u1")).toBe(false);
  });
});

describe("myGroupActions", () => {
  it("offers nothing without the MANAGE_MEMBERS Claim", () => {
    expect(myGroupActions({ isCreator: false, canManageMembers: false })).toEqual([]);
  });

  it("offers only the members page with the MANAGE_MEMBERS Claim", () => {
    expect(myGroupActions({ isCreator: false, canManageMembers: true })).toEqual(["members"]);
  });

  it("offers the members page, edit and delete to the Creator", () => {
    expect(myGroupActions({ isCreator: true, canManageMembers: true })).toEqual([
      "members",
      "edit",
      "delete",
    ]);
  });
});
