import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import type { GroupClaim } from "@/app/generated/prisma/client";
import { testPrisma } from "../support/db";
import { actAs } from "../support/session";
import { createAccessScenario, createGroup, createUser, grantClaims } from "../support/fixtures";
import {
  changeMember,
  findGroupAccess,
  listGroupAccess,
  requireGroupAccess,
} from "@/lib/group-access";

type MemberKind = "non-Member" | "plain Member" | "MANAGE_MEMBERS" | "MANAGE_CONTENT" | "Creator";

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
  const viewer = await createUser();
  await testPrisma.usersToGroups.create({ data: { userId: viewer.id, groupId: group.id } });
  if (kind !== "plain Member") {
    await grantClaims(viewer.id, group.id, [kind satisfies GroupClaim]);
  }
  return { group, creator, target, viewer };
}

type Expected = {
  manageMembers: boolean;
  manageGroup: boolean;
  changeOtherMember: boolean;
  changeCreator: boolean;
  changeSelf: boolean;
};

const NOTHING: Expected = {
  manageMembers: false,
  manageGroup: false,
  changeOtherMember: false,
  changeCreator: false,
  changeSelf: false,
};

describe("Group access by Member kind", () => {
  it.each<[MemberKind, Expected]>([
    ["non-Member", NOTHING],
    ["plain Member", NOTHING],
    ["MANAGE_CONTENT", NOTHING],
    ["MANAGE_MEMBERS", { ...NOTHING, manageMembers: true, changeOtherMember: true }],
    ["Creator", { ...NOTHING, manageMembers: true, manageGroup: true, changeOtherMember: true }],
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
        manageMembers: can("manageMembers"),
        manageGroup: can("manageGroup"),
        changeOtherMember: can(changeMember(target.id)),
        changeCreator: can(changeMember(creator.id)),
        changeSelf: can(changeMember(viewer.id)),
      }).toEqual(expected);
    }
  });

  it("does not let one Group's MANAGE_MEMBERS leak into another Group", async () => {
    const { group, member } = await createAccessScenario();
    await grantClaims(member.id, group.id, ["MANAGE_MEMBERS"]);
    const otherGroup = await createGroup();
    await testPrisma.usersToGroups.create({ data: { userId: member.id, groupId: otherGroup.id } });
    actAs(member.id);

    expect((await findGroupAccess(otherGroup.slug))?.can("manageMembers")).toBe(false);
    const listed = await listGroupAccess();
    expect(listed.find((entry) => entry.group.id === otherGroup.id)?.can("manageMembers")).toBe(false);
    expect(listed.find((entry) => entry.group.id === group.id)?.can("manageMembers")).toBe(true);
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

    await expect(requireGroupAccess(group.slug)).rejects.toThrow(
      "Ogiltig grupp eller saknad behörighet"
    );
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

    expect(() => access.require("manageGroup")).toThrow(
      "Du har inte behörighet att hantera gruppen"
    );
    expect(() => access.require(changeMember(creator.id))).toThrow(
      "Gruppens administratör kan inte ändras"
    );
    expect(() => access.require(changeMember(member.id))).toThrow(
      "Du kan inte ändra ditt eget medlemskap"
    );
  });

  it("refuses a Member without MANAGE_MEMBERS with the members message", async () => {
    const { group, creator, member } = await createAccessScenario();
    actAs(member.id);

    const access = await requireGroupAccess(group.slug);

    for (const capability of ["manageMembers", changeMember(creator.id)] as const) {
      expect(() => access.require(capability)).toThrow(
        "Du har inte behörighet att hantera medlemmar i gruppen"
      );
    }
  });

  it("uses the caller's wording for a refusal when given", async () => {
    const { group, member } = await createAccessScenario();
    actAs(member.id);

    const access = await requireGroupAccess(group.slug);

    expect(() =>
      access.require("manageGroup", { lacksManageGroup: "Du får inte byta namn" })
    ).toThrow("Du får inte byta namn");
  });
});
