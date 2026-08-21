import { testPrisma } from "./db";
import type { User, Group, Piece } from "@/app/generated/prisma/client";

let userCounter = 0;
let groupCounter = 0;

type CreateUserOptions = Partial<{
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdById: string | null;
  updatedById: string | null;
}>;

export async function createUser(
  overrides: CreateUserOptions = {},
): Promise<User> {
  userCounter += 1;
  const n = userCounter;

  return testPrisma.user.create({
    data: {
      ...(overrides.id !== undefined ? { id: overrides.id } : {}),
      name: overrides.name ?? `Test User ${n}`,
      email: overrides.email ?? `user-${n}@test.local`,
      passwordHash: overrides.passwordHash ?? "test-hash",
      createdById: overrides.createdById ?? null,
      updatedById: overrides.updatedById ?? null,
    },
  });
}

type CreateGroupOptions = Partial<{
  id: string;
  name: string;
  slug: string;
  createdById: string;
  updatedById: string;
}>;

export async function createGroup(
  overrides: CreateGroupOptions = {},
): Promise<Group> {
  groupCounter += 1;
  const n = groupCounter;

  const creatorId = overrides.createdById ?? (await createUser()).id;
  const updaterId = overrides.updatedById ?? creatorId;

  const group = await testPrisma.group.create({
    data: {
      ...(overrides.id !== undefined ? { id: overrides.id } : {}),
      name: overrides.name ?? `Test Group ${n}`,
      slug: overrides.slug ?? `test-group-${n}`,
      createdById: creatorId,
      updatedById: updaterId,
    },
  });

  await testPrisma.usersToGroups.create({
    data: { userId: creatorId, groupId: group.id },
  });

  return group;
}

type CreatePieceOptions = Partial<{
  id: string;
  name: string;
  groupId: string;
  createdById: string;
  updatedById: string;
}>;

export async function createPiece(
  overrides: CreatePieceOptions = {},
): Promise<Piece> {
  let groupId = overrides.groupId;
  let creatorId = overrides.createdById;

  if (!groupId) {
    const group = await createGroup(
      creatorId ? { createdById: creatorId, updatedById: creatorId } : {},
    );
    groupId = group.id;
    creatorId = creatorId ?? group.createdById;
  }
  if (!creatorId) {
    creatorId = (await createUser()).id;
  }

  return testPrisma.piece.create({
    data: {
      ...(overrides.id !== undefined ? { id: overrides.id } : {}),
      name: overrides.name ?? "Test Piece",
      groupId,
      createdById: creatorId,
      updatedById: overrides.updatedById ?? creatorId,
    },
  });
}

export type AccessScenario = {
  group: Group;
  creator: User;
  member: User;
  nonMember: User;
};

export async function createAccessScenario(): Promise<AccessScenario> {
  const creator = await createUser();
  const group = await createGroup({
    createdById: creator.id,
    updatedById: creator.id,
  });
  const member = await createUser();
  await testPrisma.usersToGroups.create({
    data: { userId: member.id, groupId: group.id },
  });
  const nonMember = await createUser();

  return { group, creator, member, nonMember };
}
