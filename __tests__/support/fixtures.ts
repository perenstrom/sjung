import { testPrisma } from "./db";
import type {
  User,
  Group,
  GroupClaim,
  GroupMemberClaim,
  Piece,
  PieceNote,
  Person,
  SetList,
  SetListPiece,
  SetListNote,
  File,
  Link,
} from "@/app/generated/prisma/client";

let userCounter = 0;
let groupCounter = 0;
let fileCounter = 0;

type CreateUserOptions = Partial<{
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  /** Defaults to Verified; pass `null` for an Unverified user. */
  emailVerifiedAt: Date | null;
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
      emailVerifiedAt:
        overrides.emailVerifiedAt !== undefined ? overrides.emailVerifiedAt : new Date(),
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

/** Grants Claims to an existing Member (the `UsersToGroups` row must already exist). */
export async function grantClaims(
  userId: string,
  groupId: string,
  claims: GroupClaim[],
): Promise<GroupMemberClaim[]> {
  return Promise.all(
    claims.map((claim) =>
      testPrisma.groupMemberClaim.create({ data: { userId, groupId, claim } }),
    ),
  );
}

/** A new User who is a Member of the Group, holding `claims`. */
export async function createMember(group: Group, claims: GroupClaim[] = []): Promise<User> {
  const member = await createUser();
  await testPrisma.usersToGroups.create({ data: { userId: member.id, groupId: group.id } });
  await grantClaims(member.id, group.id, claims);
  return member;
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

type CreatePieceNoteOptions = {
  piece: Piece;
  createdById: string;
  content?: string;
  updatedAt?: Date;
};

export async function createPieceNote({
  piece,
  createdById,
  content,
  updatedAt,
}: CreatePieceNoteOptions): Promise<PieceNote> {
  return testPrisma.pieceNote.create({
    data: {
      content: content ?? "Test note",
      pieceId: piece.id,
      groupId: piece.groupId,
      createdById,
      updatedById: createdById,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
    },
  });
}

/** A Person in the Group, created by the Group's Creator. */
export async function createPerson(group: Group, name = "Test Person"): Promise<Person> {
  return testPrisma.person.create({
    data: { name, groupId: group.id, createdById: group.createdById, updatedById: group.createdById },
  });
}

/** A Set list in the Group, created by the Group's Creator. */
export async function createSetList(group: Group, name = "Test Set List"): Promise<SetList> {
  return testPrisma.setList.create({
    data: { name, groupId: group.id, createdById: group.createdById, updatedById: group.createdById },
  });
}

/** Adds the Piece to the Set list at `position`, by the Set list's creator. */
export async function createSetListPiece(
  setList: SetList,
  piece: Piece,
  position = 1000,
): Promise<SetListPiece> {
  return testPrisma.setListPiece.create({
    data: {
      setListId: setList.id,
      pieceId: piece.id,
      position,
      createdById: setList.createdById,
      updatedById: setList.createdById,
    },
  });
}

/** Adds a note step to the Set list at `position`, by the Set list's creator. */
export async function createSetListNote(
  setList: SetList,
  content = "Test set list note",
  position = 1000,
): Promise<SetListNote> {
  return testPrisma.setListNote.create({
    data: {
      setListId: setList.id,
      content,
      position,
      createdById: setList.createdById,
      updatedById: setList.createdById,
    },
  });
}

/** A File row on the Piece, at its own key under the Piece; nothing is uploaded to storage. */
export async function createFile(piece: Piece): Promise<File> {
  fileCounter += 1;
  return testPrisma.file.create({
    data: {
      pieceId: piece.id,
      displayName: "Score",
      fileName: "score.pdf",
      storagePath: `groups/${piece.groupId}/pieces/${piece.id}/score-${fileCounter}.pdf`,
      mimeType: "application/pdf",
      size: 1024,
      createdById: piece.createdById,
      updatedById: piece.createdById,
    },
  });
}

/** A Link on the Piece, by the Piece's creator. */
export async function createLink(piece: Piece, url = "https://example.com"): Promise<Link> {
  return testPrisma.link.create({
    data: { pieceId: piece.id, url, createdById: piece.createdById, updatedById: piece.createdById },
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
