import { describe, expect, it } from "vitest";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import {
  changeMemberClaims,
  groupAccessDenial,
  removeMember,
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
    ["plain Member: manageGroupHome", facts("plain"), "manageGroupHome", "lacksManageGroupHome"],
    ["plain Member: viewMembers", facts("plain"), "viewMembers", "lacksManageMembers"],
    ["plain Member: removeMember(other)", facts("plain"), removeMember(OTHER), "lacksManageMembers"],
    [
      "plain Member: changeMemberClaims(other)",
      facts("plain"),
      changeMemberClaims(OTHER),
      "lacksManageMemberAuthorization",
    ],

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
    // The Group description was never part of MANAGE_CONTENT.
    [
      "MANAGE_CONTENT: manageGroupHome",
      facts("MANAGE_CONTENT"),
      "manageGroupHome",
      "lacksManageGroupHome",
    ],
    ["MANAGE_CONTENT: viewMembers", facts("MANAGE_CONTENT"), "viewMembers", "lacksManageMembers"],
    ["MANAGE_CONTENT: removeMember(other)", facts("MANAGE_CONTENT"), removeMember(OTHER), "lacksManageMembers"],

    ["MANAGE_MEMBERS: manageMembers", facts("MANAGE_MEMBERS"), "manageMembers", null],
    ["MANAGE_MEMBERS: manageContent", facts("MANAGE_MEMBERS"), "manageContent", "lacksManageContent"],
    ["MANAGE_MEMBERS: manageGroup", facts("MANAGE_MEMBERS"), "manageGroup", "lacksManageGroup"],
    ["MANAGE_MEMBERS: viewMembers", facts("MANAGE_MEMBERS"), "viewMembers", null],
    ["MANAGE_MEMBERS: removeMember(other)", facts("MANAGE_MEMBERS"), removeMember(OTHER), null],
    ["MANAGE_MEMBERS: removeMember(Creator)", facts("MANAGE_MEMBERS"), removeMember(CREATOR), "targetIsCreator"],
    ["MANAGE_MEMBERS: removeMember(self)", facts("MANAGE_MEMBERS"), removeMember(VIEWER), "targetIsSelf"],
    // Granting Claims split off into MANAGE_MEMBER_AUTHORIZATION (ADR-0013).
    [
      "MANAGE_MEMBERS: changeMemberClaims(other)",
      facts("MANAGE_MEMBERS"),
      changeMemberClaims(OTHER),
      "lacksManageMemberAuthorization",
    ],
    ["MANAGE_MEMBERS: reorderSetLists", facts("MANAGE_MEMBERS"), "reorderSetLists", "lacksReorderSetLists"],

    ["MANAGE_MEMBER_AUTHORIZATION: viewMembers", facts("MANAGE_MEMBER_AUTHORIZATION"), "viewMembers", null],
    [
      "MANAGE_MEMBER_AUTHORIZATION: changeMemberClaims(other)",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      changeMemberClaims(OTHER),
      null,
    ],
    [
      "MANAGE_MEMBER_AUTHORIZATION: changeMemberClaims(Creator)",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      changeMemberClaims(CREATOR),
      "targetIsCreator",
    ],
    [
      "MANAGE_MEMBER_AUTHORIZATION: changeMemberClaims(self)",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      changeMemberClaims(VIEWER),
      "targetIsSelf",
    ],
    [
      "MANAGE_MEMBER_AUTHORIZATION: manageMembers",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      "manageMembers",
      "lacksManageMembers",
    ],
    [
      "MANAGE_MEMBER_AUTHORIZATION: removeMember(other)",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      removeMember(OTHER),
      "lacksManageMembers",
    ],
    [
      "MANAGE_MEMBER_AUTHORIZATION: manageContent",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      "manageContent",
      "lacksManageContent",
    ],
    [
      "MANAGE_MEMBER_AUTHORIZATION: manageGroup",
      facts("MANAGE_MEMBER_AUTHORIZATION"),
      "manageGroup",
      "lacksManageGroup",
    ],

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

    [
      "MANAGE_GROUP_HOME: manageGroupHome",
      facts("MANAGE_GROUP_HOME"),
      "manageGroupHome",
      null,
    ],
    [
      "MANAGE_GROUP_HOME: manageContent",
      facts("MANAGE_GROUP_HOME"),
      "manageContent",
      "lacksManageContent",
    ],
    ["MANAGE_GROUP_HOME: manageGroup", facts("MANAGE_GROUP_HOME"), "manageGroup", "lacksManageGroup"],

    ["both Claims: manageMembers", facts("both"), "manageMembers", null],
    ["both Claims: manageContent", facts("both"), "manageContent", null],
    ["both Claims: manageGroup", facts("both"), "manageGroup", "lacksManageGroup"],

    ["Creator: manageMembers", facts("creator"), "manageMembers", null],
    ["Creator: manageContent", facts("creator"), "manageContent", null],
    ["Creator: manageGroup", facts("creator"), "manageGroup", null],
    ["Creator: reorderSetLists", facts("creator"), "reorderSetLists", null],
    ["Creator: manageRunningOrderNotes", facts("creator"), "manageRunningOrderNotes", null],
    ["Creator: manageGroupHome", facts("creator"), "manageGroupHome", null],
    ["Creator: viewMembers", facts("creator"), "viewMembers", null],
    ["Creator: removeMember(other)", facts("creator"), removeMember(OTHER), null],
    ["Creator: removeMember(self)", facts("creator"), removeMember(CREATOR), "targetIsSelf"],
    ["Creator: changeMemberClaims(other)", facts("creator"), changeMemberClaims(OTHER), null],
    ["Creator: changeMemberClaims(self)", facts("creator"), changeMemberClaims(CREATOR), "targetIsSelf"],
  ])("%s", (_label, groupFacts, capability, expected) => {
    expect(groupAccessDenial(groupFacts, capability)).toBe(expected);
  });
});
