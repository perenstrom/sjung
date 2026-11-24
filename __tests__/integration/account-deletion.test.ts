import argon2 from "argon2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { signOut } from "@/auth";
import { testPrisma } from "../support/db";
import { failEmailsTo, sentEmails } from "../support/fake-email";
import { failDeletesOf, putStoredObject, storedKeys } from "../support/fake-object-storage";
import {
  createAnnouncement,
  createFile,
  createGroup,
  createLink,
  createMember,
  createPerson,
  createPiece,
  createPieceNote,
  createSetListNote,
  createSetListPiece,
  createUser,
} from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";
import { deleteOwnAccount, getAccountDeletionPlan } from "@/app/actions/account";
import { ACCOUNT_DELETED_PATH } from "@/lib/account/routes";
import { getSessionUser } from "@/lib/auth/require-user";
import { inviteToGroup } from "@/lib/invitations/invitations";

const mockSignOut = vi.mocked(signOut);
const PASSWORD = "rätt-lösenord-123";

beforeEach(() => {
  mockSignOut.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A Verified user with a known password, acting as themselves. */
async function signedInUser(overrides: { email?: string } = {}) {
  const user = await createUser({ ...overrides, passwordHash: await argon2.hash(PASSWORD) });
  actAs(user.id);
  return user;
}

function deleteWith(password: string) {
  return deleteOwnAccount(null, formData({ password }));
}

describe("deleteOwnAccount", () => {
  it("deletes a User with no Creator Groups, frees their address and ends on the start page", async () => {
    const user = await signedInUser({ email: "anna@example.com" });

    const state = await deleteWith(PASSWORD);

    expect(state).toBeNull();
    expect(await testPrisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: ACCOUNT_DELETED_PATH });
    // The address can sign up again.
    await expect(createUser({ email: "anna@example.com" })).resolves.toBeTruthy();
  });

  it("logs out the User's other sessions", async () => {
    const user = await signedInUser();

    await deleteWith(PASSWORD);

    actAs(user.id);
    expect(await getSessionUser()).toBeNull();
  });

  it("deletes nothing and says so when the password is wrong", async () => {
    const user = await signedInUser();
    const soloGroup = await createGroup({ createdById: user.id });

    const state = await deleteWith("fel-lösenord");

    expect(state).toEqual({ error: "Fel lösenord" });
    expect(await testPrisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await testPrisma.group.findUnique({ where: { id: soloGroup.id } })).not.toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(sentEmails()).toEqual([]);
  });

  it("refuses an Unverified user", async () => {
    const user = await createUser({ emailVerifiedAt: null, passwordHash: await argon2.hash(PASSWORD) });
    actAs(user.id);

    await expect(deleteWith(PASSWORD)).rejects.toThrow("E-postadressen är inte bekräftad");
    expect(await testPrisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it("keeps content in other Groups, no longer attributed to the User", async () => {
    const user = await signedInUser();
    const group = await createGroup();
    await testPrisma.usersToGroups.create({ data: { userId: user.id, groupId: group.id } });
    await testPrisma.group.update({ where: { id: group.id }, data: { updatedById: user.id } });
    const piece = await createPiece({ groupId: group.id, createdById: user.id });
    const file = await createFile(piece);
    const link = await createLink(piece);
    const pieceNote = await createPieceNote({ piece, createdById: user.id });
    const person = await testPrisma.person.create({
      data: { name: "Kompositör", groupId: group.id, createdById: user.id, updatedById: user.id },
    });
    const setList = await testPrisma.setList.create({
      data: { name: "Vårkonsert", groupId: group.id, createdById: user.id, updatedById: user.id },
    });
    const setListPiece = await createSetListPiece(setList, piece);
    const setListNote = await createSetListNote(setList);
    const setListPieceNote = await testPrisma.setListPieceNote.create({
      data: {
        content: "Andas här",
        setListPieceId: setListPiece.id,
        groupId: group.id,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const otherUser = await createUser({ createdById: user.id, updatedById: user.id });

    await deleteWith(PASSWORD);

    const audit = { createdById: true, updatedById: true } as const;
    const remaining = {
      piece: await testPrisma.piece.findUnique({ where: { id: piece.id }, select: audit }),
      file: await testPrisma.file.findUnique({ where: { id: file.id }, select: audit }),
      link: await testPrisma.link.findUnique({ where: { id: link.id }, select: audit }),
      pieceNote: await testPrisma.pieceNote.findUnique({ where: { id: pieceNote.id }, select: audit }),
      person: await testPrisma.person.findUnique({ where: { id: person.id }, select: audit }),
      setList: await testPrisma.setList.findUnique({ where: { id: setList.id }, select: audit }),
      setListPiece: await testPrisma.setListPiece.findUnique({ where: { id: setListPiece.id }, select: audit }),
      setListNote: await testPrisma.setListNote.findUnique({ where: { id: setListNote.id }, select: audit }),
      setListPieceNote: await testPrisma.setListPieceNote.findUnique({
        where: { id: setListPieceNote.id },
        select: audit,
      }),
      otherUser: await testPrisma.user.findUnique({ where: { id: otherUser.id }, select: audit }),
    };
    const cleared = { createdById: null, updatedById: null };
    expect(remaining).toEqual(Object.fromEntries(Object.keys(remaining).map((row) => [row, cleared])));
    expect(await testPrisma.group.findUnique({ where: { id: group.id }, select: { updatedById: true } })).toEqual({
      updatedById: null,
    });
  });

  it("deletes the Groups where the User is Creator and the only Member, with their stored Files", async () => {
    const user = await signedInUser();
    const soloGroup = await createGroup({ createdById: user.id });
    const piece = await createPiece({ groupId: soloGroup.id, createdById: user.id });
    const file = await createFile(piece);
    putStoredObject(file.storagePath);
    await createPerson(soloGroup);
    const otherFile = await createFile(await createPiece());
    putStoredObject(otherFile.storagePath);

    await deleteWith(PASSWORD);

    expect(await testPrisma.group.findUnique({ where: { id: soloGroup.id } })).toBeNull();
    expect(await testPrisma.piece.findUnique({ where: { id: piece.id } })).toBeNull();
    expect(storedKeys()).toEqual([otherFile.storagePath]);
  });

  it("still deletes the account when some stored Files can't be removed", async () => {
    const user = await signedInUser();
    const soloGroup = await createGroup({ createdById: user.id });
    const file = await createFile(await createPiece({ groupId: soloGroup.id, createdById: user.id }));
    putStoredObject(file.storagePath);
    failDeletesOf(file.storagePath);

    await deleteWith(PASSWORD);

    expect(await testPrisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await testPrisma.group.findUnique({ where: { id: soloGroup.id } })).toBeNull();
  });

  it("refuses while the User is Creator of a Group with other Members", async () => {
    const user = await signedInUser();
    const sharedGroup = await createGroup({ createdById: user.id });
    await createMember(sharedGroup);
    const soloGroup = await createGroup({ createdById: user.id });

    const state = await deleteWith(PASSWORD);

    expect(state).toEqual({
      error: "Du är administratör för en grupp med andra medlemmar. Ta bort gruppen först.",
    });
    expect(await testPrisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await testPrisma.group.findUnique({ where: { id: soloGroup.id } })).not.toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("keeps Invitations to the User's address, and those they sent without a sender", async () => {
    const user = await signedInUser({ email: "anna@example.com" });
    const otherGroup = await createGroup();
    await inviteToGroup({ groupId: otherGroup.id, email: "anna@example.com", invitedById: otherGroup.createdById });
    const sharedGroup = await createGroup();
    await testPrisma.usersToGroups.create({ data: { userId: user.id, groupId: sharedGroup.id } });
    await inviteToGroup({ groupId: sharedGroup.id, email: "bertil@example.com", invitedById: user.id });

    await deleteWith(PASSWORD);

    expect(
      await testPrisma.invitation.findUnique({
        where: { groupId_email: { groupId: otherGroup.id, email: "anna@example.com" } },
      }),
    ).not.toBeNull();
    expect(
      await testPrisma.invitation.findUnique({
        where: { groupId_email: { groupId: sharedGroup.id, email: "bertil@example.com" } },
        select: { invitedById: true },
      }),
    ).toEqual({ invitedById: null });
  });

  it("takes the User's Announcement read state with them, and keeps Announcements they wrote without an author", async () => {
    const user = await signedInUser();
    const written = await createAnnouncement({ createdById: user.id });
    const read = await createAnnouncement();
    await testPrisma.announcementRead.create({ data: { userId: user.id, announcementId: read.id } });

    await deleteWith(PASSWORD);

    expect(await testPrisma.announcementRead.count()).toBe(0);
    expect(
      await testPrisma.announcement.findUnique({
        where: { id: written.id },
        select: { createdById: true, updatedById: true },
      }),
    ).toEqual({ createdById: null, updatedById: null });
  });

  it("emails a receipt to the former address", async () => {
    await signedInUser({ email: "anna@example.com" });

    await deleteWith(PASSWORD);

    const receipt = sentEmails().find((email) => email.to === "anna@example.com");
    expect(receipt?.subject).toBe("Ditt konto på Sjung är borttaget");
  });

  it("still deletes the account when the receipt can't be sent", async () => {
    const user = await signedInUser({ email: "anna@example.com" });
    failEmailsTo("anna@example.com");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await deleteWith(PASSWORD);

    expect(state).toBeNull();
    expect(await testPrisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("getAccountDeletionPlan", () => {
  it("splits the User's Creator Groups into those deleted with the account and those blocking it", async () => {
    const user = await signedInUser();
    const soloGroup = await createGroup({ createdById: user.id, name: "Bara jag" });
    const sharedGroup = await createGroup({ createdById: user.id, name: "Kören" });
    await createMember(sharedGroup);
    const memberOnlyGroup = await createGroup();
    await testPrisma.usersToGroups.create({ data: { userId: user.id, groupId: memberOnlyGroup.id } });

    const plan = await getAccountDeletionPlan();

    expect(plan).toEqual({
      soloGroups: [{ id: soloGroup.id, name: "Bara jag", slug: soloGroup.slug }],
      sharedGroups: [{ id: sharedGroup.id, name: "Kören", slug: sharedGroup.slug }],
    });
  });

  it("refuses an Unverified user", async () => {
    actAs((await createUser({ emailVerifiedAt: null })).id);

    await expect(getAccountDeletionPlan()).rejects.toThrow("E-postadressen är inte bekräftad");
  });
});
