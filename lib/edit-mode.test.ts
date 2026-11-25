import { describe, expect, it } from "vitest";

import type { GroupAccess, GroupCapability } from "@/lib/group-access";
import { heldEditCapabilities, type EditCapability } from "./edit-mode";

function accessHolding(held: GroupCapability[]): GroupAccess {
  return {
    userId: "viewer",
    group: { id: "group", slug: "koren", name: "Kören" },
    can: (capability) => held.includes(capability),
    require: () => {},
  };
}

describe("heldEditCapabilities", () => {
  it.each<[string, GroupAccess | null, EditCapability[], EditCapability[]]>([
    // Every page but a Set list's: a reorder-only Member gets no Edit toggle there.
    ["reorder-only, page using manageContent", accessHolding(["reorderSetLists"]), ["manageContent"], []],
    [
      "reorder-only, Set list page",
      accessHolding(["reorderSetLists"]),
      ["manageContent", "reorderSetLists"],
      ["reorderSetLists"],
    ],
    [
      "manageContent, Set list page",
      accessHolding(["manageContent"]),
      ["manageContent", "reorderSetLists"],
      ["manageContent"],
    ],
    ["not a Member", null, ["manageContent", "reorderSetLists"], []],
  ])("%s", (_label, access, relevant, expected) => {
    expect(heldEditCapabilities(access, relevant)).toEqual(expected);
  });
});
