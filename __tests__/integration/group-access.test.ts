import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import type { GroupClaim } from "@/app/generated/prisma/client";
import type { GroupCapability } from "@/lib/group-access";
import { testPrisma } from "../support/db";
import { actAs } from "../support/session";
import { createAccessScenario, createGroup, createMember, grantClaims } from "../support/fixtures";
import {
  changeMemberClaims,
  findGroupAccess,
  listGroupAccess,
  removeMember,
  requireGroupAccess,
} from "@/lib/group-access";

type MemberKind = "non-Member" | "plain Member" | GroupClaim | "Creator";

/**
 * A Group with its Creator and a plain Member as change targets, and a viewer of
 * the given kind. The plain Member target is a separate User from the viewer.
 */
async function createViewer(kind: MemberKind) {
  const { group, creator, member: target, nonMember } = await createAccessScenario();
  if (kind === "Creator") {
    return { group, creator, target, viewer: creator };
  }
  if (kind === "non-Member") {
    return { group, creator, target, viewer: nonMember };
  }
  const viewer = await createMember(group, kind === "plain Member" ? [] : [kind satisfies GroupClaim]);
  return { group, creator, target, viewer };
}

type Expected = {
  manageContent: boolean;
  reorderSetLists: boolean;
  manageRunningOrderNotes: boolean;
  manageGroupDescription: boolean;
  viewMembers: boolean;
  manageMembers: boolean;
  manageGroup: boolean;
  removeOtherMember: boolean;
  removeCreator: boolean;
  removeSelf: boolean;
  changeOtherMemberClaims: boolean;
  changeCreatorClaims: boolean;
  changeOwnClaims: boolean;
};

const NOTHING: Expected = {
  manageContent: false,
  reorderSetLists: false,
  manageRunningOrderNotes: false,
  manageGroupDescription: false,
  viewMembers: false,
  manageMembers: false,
  manageGroup: false,
  removeOtherMember: false,
  removeCreator: false,
  removeSelf: false,
  changeOtherMemberClaims: false,
  changeCreatorClaims: false,
  changeOwnClaims: false,
};

describe("Group access by Member kind", () => {
  it.each<[MemberKind, Expected]>([
    ["non-Member", NOTHING],
    ["plain Member", NOTHING],
    ["MANAGE_CONTENT", { ...NOTHING, manageContent: true }],
    ["MANAGE_MEMBERS", { ...NOTHING, viewMembers: true, manageMembers: true, removeOtherMember: true }],
    ["MANAGE_MEMBER_AUTHORIZATION", { ...NOTHING, viewMembers: true, changeOtherMemberClaims: true }],
    ["REORDER_SET_LISTS", { ...NOTHING, reorderSetLists: true }],
    ["MANAGE_RUNNING_ORDER_NOTES", { ...NOTHING, manageRunningOrderNotes: true }],
    ["MANAGE_GROUP_DESCRIPTION", { ...NOTHING, manageGroupDescription: true }],
    [
      "Creator",
      {
        ...NOTHING,
        manageContent: true,
        reorderSetLists: true,
        manageRunningOrderNotes: true,
        manageGroupDescription: true,
        viewMembers: true,
        manageMembers: true,
        manageGroup: true,
        removeOtherMember: true,
        changeOtherMemberClaims: true,
      },
    ],
  ])("%s", async (kind, expected) => {
    const { group, creator, target, viewer } = await createViewer(kind);
    actAs(viewer.id);

    const access = await findGroupAccess(group.slug);
    const listed = (await listGroupAccess()).find((entry) => entry.group.id === group.id);

    expect(access === null).toBe(kind === "non-Member");
    expect(listed === undefined).toBe(kind === "non-Member");

    for (const entry of [access, listed]) {
      const can = entry?.can.bind(entry) ?? (() => false);
      expect({
        manageContent: can("manageContent"),
        reorderSetLists: can("reorderSetLists"),
        manageRunningOrderNotes: can("manageRunningOrderNotes"),
        manageGroupDescription: can("manageGroupDescription"),
        viewMembers: can("viewMembers"),
        manageMembers: can("manageMembers"),
        manageGroup: can("manageGroup"),
        removeOtherMember: can(removeMember(target.id)),
        removeCreator: can(removeMember(creator.id)),
        removeSelf: can(removeMember(viewer.id)),
        changeOtherMemberClaims: can(changeMemberClaims(target.id)),
        changeCreatorClaims: can(changeMemberClaims(creator.id)),
        changeOwnClaims: can(changeMemberClaims(viewer.id)),
      }).toEqual(expected);
    }
  });

  it.each<[GroupClaim, GroupCapability]>([
    ["MANAGE_MEMBERS", "manageMembers"],
    ["MANAGE_MEMBER_AUTHORIZATION", "viewMembers"],
  ])("does not let one Group's %s leak into another Group", async (claim, capability) => {
    const { group, member } = await createAccessScenario();
    await grantClaims(member.id, group.id, [claim]);
    const otherGroup = await createGroup();
    const otherTarget = await createMember(otherGroup, []);
    await testPrisma.usersToGroups.create({ data: { userId: member.id, groupId: otherGroup.id } });
    actAs(member.id);

    const other = await findGroupAccess(otherGroup.slug);
    expect(other?.can(capability)).toBe(false);
    expect(other?.can(changeMemberClaims(otherTarget.id))).toBe(false);
    const listed = await listGroupAccess();
    expect(listed.find((entry) => entry.group.id === otherGroup.id)?.can(capability)).toBe(false);
    expect(listed.find((entry) => entry.group.id === group.id)?.can(capability)).toBe(true);
  });
});

describe("requireGroupAccess", () => {
  it("names the Group the viewer is a Member of", async () => {
    const { group, member } = await createAccessScenario();
    actAs(member.id);

    const access = await requireGroupAccess(group.slug);

    expect(access.userId).toBe(member.id);
    expect(access.group).toEqual({ id: group.id, slug: group.slug, name: group.name });
  });

  it("throws for a non-Member", async () => {
    const { group, nonMember } = await createAccessScenario();
    actAs(nonMember.id);

    await expect(requireGroupAccess(group.slug)).rejects.toThrow("Ogiltig grupp eller saknad behörighet");
  });
});

describe("GroupAccess.require", () => {
  it("passes when the viewer has the capability", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);

    const access = await requireGroupAccess(group.slug);

    expect(() => access.require("manageGroup")).not.toThrow();
  });

  it("throws a message specific to the refused capability", async () => {
    const { group, creator, member } = await createAccessScenario();
    await grantClaims(member.id, group.id, ["MANAGE_MEMBERS"]);
    actAs(member.id);

    const access = await requireGroupAccess(group.slug);

    expect(() => access.require("manageGroup")).toThrow("Du har inte behörighet att hantera gruppen");
    expect(() => access.require(removeMember(creator.id))).toThrow("Gruppens administratör kan inte ändras");
    expect(() => access.require(removeMember(member.id))).toThrow("Du kan inte ändra ditt eget medlemskap");
    expect(() => access.require(changeMemberClaims(creator.id))).toThrow(
      "Du har inte behörighet att ändra behörigheter i gruppen",
    );
  });

  it("refuses a Member without MANAGE_MEMBERS with the members message", async () => {
    const { group, creator, member } = await createAccessScenario();
    actAs(member.id);

    const access = await requireGroupAccess(group.slug);

    for (const capability of ["viewMembers", "manageMembers", removeMember(creator.id)] as const) {
      expect(() => access.require(capability)).toThrow("Du har inte behörighet att hantera medlemmar i gruppen");
    }
  });

  it("uses the caller's wording for a refusal when given", async () => {
    const { group, member } = await createAccessScenario();
    actAs(member.id);

    const access = await requireGroupAccess(group.slug);

    expect(() => access.require("manageGroup", { lacksManageGroup: "Du får inte byta namn" })).toThrow(
      "Du får inte byta namn",
    );
  });
});
