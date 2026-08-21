import { describe, test, expect } from "vitest";
import { testPrisma } from "../support/db";
import {
  createUser,
  createGroup,
  createPiece,
  createAccessScenario,
} from "../support/fixtures";

describe("createUser", () => {
  test("persists a user with a deterministic unique email", async () => {
    const first = await createUser();
    const second = await createUser();

    expect(first.email).not.toBe(second.email);

    const found = await testPrisma.user.findUnique({
      where: { id: first.id },
    });
    expect(found?.email).toBe(first.email);
  });

  test("accepts overrides", async () => {
    const user = await createUser({ name: "Alice" });
    expect(user.name).toBe("Alice");
  });
});

describe("createGroup", () => {
  test("auto-creates a creator user and adds them as a member", async () => {
    const group = await createGroup();

    const creator = await testPrisma.user.findUnique({
      where: { id: group.createdById },
    });
    expect(creator).not.toBeNull();

    const membership = await testPrisma.usersToGroups.findUnique({
      where: {
        userId_groupId: { userId: group.createdById, groupId: group.id },
      },
    });
    expect(membership).not.toBeNull();
  });

  test("reuses a provided creator instead of creating a new one", async () => {
    const creator = await createUser();
    const group = await createGroup({
      createdById: creator.id,
      updatedById: creator.id,
    });

    expect(group.createdById).toBe(creator.id);
    expect(await testPrisma.user.count()).toBe(1);
  });
});

describe("createPiece", () => {
  test("with no overrides, creates a user then a group then the piece", async () => {
    const piece = await createPiece();

    const group = await testPrisma.group.findUnique({
      where: { id: piece.groupId },
    });
    expect(group).not.toBeNull();

    const membership = await testPrisma.usersToGroups.findUnique({
      where: {
        userId_groupId: { userId: piece.createdById, groupId: piece.groupId },
      },
    });
    expect(membership).not.toBeNull();
  });

  test("accepts an explicit group instead of creating one", async () => {
    const group = await createGroup();
    const piece = await createPiece({
      groupId: group.id,
      createdById: group.createdById,
      updatedById: group.createdById,
    });

    expect(piece.groupId).toBe(group.id);
  });
});

describe("createAccessScenario", () => {
  test("creates a group with a creator, a member, and a non-member", async () => {
    const scenario = await createAccessScenario();

    const creatorMembership = await testPrisma.usersToGroups.findUnique({
      where: {
        userId_groupId: {
          userId: scenario.creator.id,
          groupId: scenario.group.id,
        },
      },
    });
    const memberMembership = await testPrisma.usersToGroups.findUnique({
      where: {
        userId_groupId: {
          userId: scenario.member.id,
          groupId: scenario.group.id,
        },
      },
    });
    const nonMemberMembership = await testPrisma.usersToGroups.findUnique({
      where: {
        userId_groupId: {
          userId: scenario.nonMember.id,
          groupId: scenario.group.id,
        },
      },
    });

    expect(scenario.group.createdById).toBe(scenario.creator.id);
    expect(creatorMembership).not.toBeNull();
    expect(memberMembership).not.toBeNull();
    expect(nonMemberMembership).toBeNull();
  });
});

describe("test isolation", () => {
  test("starts each test against an empty database", async () => {
    expect(await testPrisma.user.count()).toBe(0);
    expect(await testPrisma.group.count()).toBe(0);
  });
});
