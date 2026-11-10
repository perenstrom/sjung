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

function facts(kind: "plain" | GroupClaim | "creator"): GroupAccessFacts {
  if (kind === "creator") {
    return { userId: CREATOR, creatorId: CREATOR, claims: [] };
  }
  return { userId: VIEWER, creatorId: CREATOR, claims: kind === "plain" ? [] : [kind] };
}

describe("groupAccessDenial", () => {
  it.each<[string, GroupAccessFacts, GroupCapability, GroupAccessDenial | null]>([
    ["plain Member: manageMembers", facts("plain"), "manageMembers", "lacksManageMembers"],
    ["plain Member: manageGroup", facts("plain"), "manageGroup", "lacksManageGroup"],
    ["plain Member: changeMember(other)", facts("plain"), changeMember(OTHER), "lacksManageMembers"],

    ["MANAGE_CONTENT: manageMembers", facts("MANAGE_CONTENT"), "manageMembers", "lacksManageMembers"],
    ["MANAGE_CONTENT: manageGroup", facts("MANAGE_CONTENT"), "manageGroup", "lacksManageGroup"],
    ["MANAGE_CONTENT: changeMember(other)", facts("MANAGE_CONTENT"), changeMember(OTHER), "lacksManageMembers"],

    ["MANAGE_MEMBERS: manageMembers", facts("MANAGE_MEMBERS"), "manageMembers", null],
    ["MANAGE_MEMBERS: manageGroup", facts("MANAGE_MEMBERS"), "manageGroup", "lacksManageGroup"],
    ["MANAGE_MEMBERS: changeMember(other)", facts("MANAGE_MEMBERS"), changeMember(OTHER), null],
    ["MANAGE_MEMBERS: changeMember(Creator)", facts("MANAGE_MEMBERS"), changeMember(CREATOR), "targetIsCreator"],
    ["MANAGE_MEMBERS: changeMember(self)", facts("MANAGE_MEMBERS"), changeMember(VIEWER), "targetIsSelf"],

    ["Creator: manageMembers", facts("creator"), "manageMembers", null],
    ["Creator: manageGroup", facts("creator"), "manageGroup", null],
    ["Creator: changeMember(other)", facts("creator"), changeMember(OTHER), null],
    ["Creator: changeMember(self)", facts("creator"), changeMember(CREATOR), "targetIsSelf"],
  ])("%s", (_label, groupFacts, capability, expected) => {
    expect(groupAccessDenial(groupFacts, capability)).toBe(expected);
  });
});
