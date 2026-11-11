import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { File, Group, Piece } from "@/app/generated/prisma/client";
import { GroupClaim } from "@/app/generated/prisma/enums";
import {
  createPieceFileReplaceUploadUrl,
  createPieceFileUploadUrl,
  deletePieceFile,
  finalizePieceFileReplace,
} from "@/app/actions/files";
import { deletePiece } from "@/app/actions/pieces";
import { testPrisma } from "../support/db";
import { failDeletesOf, putStoredObject, storedKeys } from "../support/fake-object-storage";
import { createFile, createGroup, createMember, createPiece } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

let group: Group;
let piece: Piece;

beforeEach(async () => {
  group = await createGroup();
  piece = await createPiece({ groupId: group.id, createdById: group.createdById });
  actAs((await createMember(group, [GroupClaim.MANAGE_CONTENT])).id);
});

/** A File on the Piece whose content is in storage. */
async function storedFile(onPiece: Piece = piece): Promise<File> {
  const file = await createFile(onPiece);
  putStoredObject(file.storagePath);
  return file;
}

/** Signs an upload as the browser would ask for it, then puts the object, as the browser's PUT would. */
async function uploadReplacementFor(file: File): Promise<string> {
  const { storagePath } = await createPieceFileReplaceUploadUrl(
    formData({
      groupSlug: group.slug,
      fileId: file.id,
      fileName: "ny.pdf",
      mimeType: "application/pdf",
      size: "2048",
    })
  );
  putStoredObject(storagePath, { size: 2048, contentType: "application/pdf" });
  return storagePath;
}

function replace(file: File, storagePath: string) {
  return finalizePieceFileReplace(
    formData({
      groupSlug: group.slug,
      fileId: file.id,
      fileName: "ny.pdf",
      storagePath,
      mimeType: "application/pdf",
      size: "2048",
    })
  );
}

describe("replacing a File", () => {
  it("points the File at the new object and deletes the old one", async () => {
    const file = await storedFile();
    const newPath = await uploadReplacementFor(file);

    await replace(file, newPath);

    expect(await testPrisma.file.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({
      storagePath: newPath,
      fileName: "ny.pdf",
    });
    expect(storedKeys()).toEqual([newPath]);
  });

  it("still succeeds when the old object can't be deleted", async () => {
    const file = await storedFile();
    const newPath = await uploadReplacementFor(file);
    failDeletesOf(file.storagePath);

    await replace(file, newPath);

    expect(await testPrisma.file.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({
      storagePath: newPath,
    });
  });
});

describe("deleting a File", () => {
  it("removes the row and its object", async () => {
    const file = await storedFile();
    const other = await storedFile();

    await deletePieceFile(formData({ groupSlug: group.slug, fileId: file.id }));

    expect(await testPrisma.file.findUnique({ where: { id: file.id } })).toBeNull();
    expect(storedKeys()).toEqual([other.storagePath]);
  });

  it("still removes the row when the object can't be deleted", async () => {
    const file = await storedFile();
    failDeletesOf(file.storagePath);

    await deletePieceFile(formData({ groupSlug: group.slug, fileId: file.id }));

    expect(await testPrisma.file.findUnique({ where: { id: file.id } })).toBeNull();
  });
});

describe("deleting a Piece", () => {
  it("removes its Files and every object under the Piece, finalized or not", async () => {
    await storedFile();
    await storedFile();
    const { storagePath: unfinalized } = await createPieceFileUploadUrl(
      formData({
        groupSlug: group.slug,
        pieceId: piece.id,
        fileName: "halv.pdf",
        mimeType: "application/pdf",
        size: "1024",
      })
    );
    putStoredObject(unfinalized);
    const otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });
    const kept = await storedFile(otherPiece);

    await deletePiece(formData({ groupSlug: group.slug, pieceId: piece.id }));

    expect(await testPrisma.piece.findUnique({ where: { id: piece.id } })).toBeNull();
    expect(await testPrisma.file.count({ where: { pieceId: piece.id } })).toBe(0);
    expect(storedKeys()).toEqual([kept.storagePath]);
  });

  it("still removes the Piece and its Files when some objects can't be deleted", async () => {
    const failing = await storedFile();
    await storedFile();
    failDeletesOf(failing.storagePath);

    await deletePiece(formData({ groupSlug: group.slug, pieceId: piece.id }));

    expect(await testPrisma.piece.findUnique({ where: { id: piece.id } })).toBeNull();
    expect(storedKeys()).toEqual([failing.storagePath]);
  });
});
