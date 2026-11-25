import { describe, expect, it } from "vitest";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import {
  changeMember,
  groupAccessDenial,
  type GroupAccessDenial,
  type GroupAccessFacts,
  type GroupCapability,
} from "./group-access-policy";

const VIEWER = "viewer";
const OTHER = "other";
const CREATOR = "creator";

function facts(kind: "plain" | GroupClaim | "both" | "creator"): GroupAccessFacts {
  if (kind === "creator") {
    return { userId: CREATOR, creatorId: CREATOR, claims: [] };
  }
  if (kind === "both") {
    return { userId: VIEWER, creatorId: CREATOR, claims: ["MANAGE_MEMBERS", "MANAGE_CONTENT"] };
  }
  return { userId: VIEWER, creatorId: CREATOR, claims: kind === "plain" ? [] : [kind] };
}

describe("groupAccessDenial", () => {
  it.each<[string, GroupAccessFacts, GroupCapability, GroupAccessDenial | null]>([
    ["plain Member: manageMembers", facts("plain"), "manageMembers", "lacksManageMembers"],
    ["plain Member: manageContent", facts("plain"), "manageContent", "lacksManageContent"],
    ["plain Member: manageGroup", facts("plain"), "manageGroup", "lacksManageGroup"],
    ["plain Member: reorderSetLists", facts("plain"), "reorderSetLists", "lacksReorderSetLists"],
    [
      "plain Member: manageRunningOrderNotes",
      facts("plain"),
      "manageRunningOrderNotes",
      "lacksManageRunningOrderNotes",
    ],
    ["plain Member: changeMember(other)", facts("plain"), changeMember(OTHER), "lacksManageMembers"],

    ["MANAGE_CONTENT: manageMembers", facts("MANAGE_CONTENT"), "manageMembers", "lacksManageMembers"],
    ["MANAGE_CONTENT: manageContent", facts("MANAGE_CONTENT"), "manageContent", null],
    ["MANAGE_CONTENT: manageGroup", facts("MANAGE_CONTENT"), "manageGroup", "lacksManageGroup"],
    // Each Claim stands on its own (ADR-0012): MANAGE_CONTENT doesn't include reordering.
    ["MANAGE_CONTENT: reorderSetLists", facts("MANAGE_CONTENT"), "reorderSetLists", "lacksReorderSetLists"],
    [
      "MANAGE_CONTENT: manageRunningOrderNotes",
      facts("MANAGE_CONTENT"),
      "manageRunningOrderNotes",
      "lacksManageRunningOrderNotes",
    ],
    ["MANAGE_CONTENT: changeMember(other)", facts("MANAGE_CONTENT"), changeMember(OTHER), "lacksManageMembers"],

    ["MANAGE_MEMBERS: manageMembers", facts("MANAGE_MEMBERS"), "manageMembers", null],
    ["MANAGE_MEMBERS: manageContent", facts("MANAGE_MEMBERS"), "manageContent", "lacksManageContent"],
    ["MANAGE_MEMBERS: manageGroup", facts("MANAGE_MEMBERS"), "manageGroup", "lacksManageGroup"],
    ["MANAGE_MEMBERS: changeMember(other)", facts("MANAGE_MEMBERS"), changeMember(OTHER), null],
    ["MANAGE_MEMBERS: changeMember(Creator)", facts("MANAGE_MEMBERS"), changeMember(CREATOR), "targetIsCreator"],
    ["MANAGE_MEMBERS: reorderSetLists", facts("MANAGE_MEMBERS"), "reorderSetLists", "lacksReorderSetLists"],
    ["MANAGE_MEMBERS: changeMember(self)", facts("MANAGE_MEMBERS"), changeMember(VIEWER), "targetIsSelf"],

    ["REORDER_SET_LISTS: reorderSetLists", facts("REORDER_SET_LISTS"), "reorderSetLists", null],
    ["REORDER_SET_LISTS: manageContent", facts("REORDER_SET_LISTS"), "manageContent", "lacksManageContent"],
    ["REORDER_SET_LISTS: manageMembers", facts("REORDER_SET_LISTS"), "manageMembers", "lacksManageMembers"],
    ["REORDER_SET_LISTS: manageGroup", facts("REORDER_SET_LISTS"), "manageGroup", "lacksManageGroup"],
    [
      "REORDER_SET_LISTS: manageRunningOrderNotes",
      facts("REORDER_SET_LISTS"),
      "manageRunningOrderNotes",
      "lacksManageRunningOrderNotes",
    ],

    [
      "MANAGE_RUNNING_ORDER_NOTES: manageRunningOrderNotes",
      facts("MANAGE_RUNNING_ORDER_NOTES"),
      "manageRunningOrderNotes",
      null,
    ],
    [
      "MANAGE_RUNNING_ORDER_NOTES: manageContent",
      facts("MANAGE_RUNNING_ORDER_NOTES"),
      "manageContent",
      "lacksManageContent",
    ],
    [
      "MANAGE_RUNNING_ORDER_NOTES: reorderSetLists",
      facts("MANAGE_RUNNING_ORDER_NOTES"),
      "reorderSetLists",
      "lacksReorderSetLists",
    ],
    [
      "MANAGE_RUNNING_ORDER_NOTES: manageMembers",
      facts("MANAGE_RUNNING_ORDER_NOTES"),
      "manageMembers",
      "lacksManageMembers",
    ],
    ["MANAGE_RUNNING_ORDER_NOTES: manageGroup", facts("MANAGE_RUNNING_ORDER_NOTES"), "manageGroup", "lacksManageGroup"],

    ["both Claims: manageMembers", facts("both"), "manageMembers", null],
    ["both Claims: manageContent", facts("both"), "manageContent", null],
    ["both Claims: manageGroup", facts("both"), "manageGroup", "lacksManageGroup"],

    ["Creator: manageMembers", facts("creator"), "manageMembers", null],
    ["Creator: manageContent", facts("creator"), "manageContent", null],
    ["Creator: manageGroup", facts("creator"), "manageGroup", null],
    ["Creator: reorderSetLists", facts("creator"), "reorderSetLists", null],
    ["Creator: manageRunningOrderNotes", facts("creator"), "manageRunningOrderNotes", null],
    ["Creator: changeMember(other)", facts("creator"), changeMember(OTHER), null],
    ["Creator: changeMember(self)", facts("creator"), changeMember(CREATOR), "targetIsSelf"],
  ])("%s", (_label, groupFacts, capability, expected) => {
    expect(groupAccessDenial(groupFacts, capability)).toBe(expected);
  });
});
