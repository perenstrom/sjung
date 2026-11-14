import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { File, Group, Piece } from "@/app/generated/prisma/client";
import { GroupClaim } from "@/app/generated/prisma/enums";
import {
  createPieceFileDownloadUrl,
  createPieceFileReplaceUploadUrl,
  createPieceFileUploadUrl,
  deletePieceFile,
  finalizePieceFileReplace,
  finalizePieceFileUpload,
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
    })
  );
}

/** Signs an upload to the Piece as the browser would ask for it; nothing is put in storage yet. */
async function signUploadToPiece(declared = { mimeType: "application/pdf", size: "1024" }) {
  const { storagePath } = await createPieceFileUploadUrl(
    formData({ groupSlug: group.slug, pieceId: piece.id, fileName: "Stämma 1.pdf", ...declared })
  );
  return storagePath;
}

function finalizeUpload(storagePath: string) {
  return finalizePieceFileUpload(
    formData({ groupSlug: group.slug, pieceId: piece.id, fileName: "Stämma 1.pdf", storagePath })
  );
}

describe("adding a File", () => {
  it("creates a File whose size and type come from the stored object", async () => {
    const storagePath = await signUploadToPiece();
    putStoredObject(storagePath, { size: 4321, contentType: "image/png" });

    await finalizeUpload(storagePath);

    expect(await testPrisma.file.findMany({ where: { pieceId: piece.id } })).toEqual([
      expect.objectContaining({
        storagePath,
        fileName: "Stämma 1.pdf",
        displayName: "Stämma 1.pdf",
        size: 4321,
        mimeType: "image/png",
      }),
    ]);
  });

  it("is rejected when nothing was uploaded", async () => {
    const storagePath = await signUploadToPiece();

    await expect(finalizeUpload(storagePath)).rejects.toThrow("Filen hittades inte i lagringen");
    expect(await testPrisma.file.count()).toBe(0);
  });

  it("is rejected for a path outside the Piece", async () => {
    const otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });
    const storagePath = `groups/${group.id}/pieces/${otherPiece.id}/stolen.pdf`;
    putStoredObject(storagePath);

    await expect(finalizeUpload(storagePath)).rejects.toThrow("Ogiltig filsökväg");
    expect(await testPrisma.file.count()).toBe(0);
  });

  it("is rejected for a path another File already uses", async () => {
    const existing = await storedFile();

    await expect(finalizeUpload(existing.storagePath)).rejects.toThrow("Filen finns redan");
    expect(await testPrisma.file.count()).toBe(1);
  });

  it("is rejected when the stored object's type isn't allowed", async () => {
    const storagePath = await signUploadToPiece();
    putStoredObject(storagePath, { size: 1024, contentType: "text/html" });

    await expect(finalizeUpload(storagePath)).rejects.toThrow("Filtypen stöds inte");
    expect(await testPrisma.file.count()).toBe(0);
  });

  it("is rejected when the stored object is too large", async () => {
    const storagePath = await signUploadToPiece();
    putStoredObject(storagePath, { size: 50 * 1024 * 1024 + 1, contentType: "application/pdf" });

    await expect(finalizeUpload(storagePath)).rejects.toThrow("Filen är för stor (max 50 MB)");
    expect(await testPrisma.file.count()).toBe(0);
  });
});

describe("replacing a File", () => {
  it("points the File at the new object and deletes the old one", async () => {
    const file = await storedFile();
    const newPath = await uploadReplacementFor(file);

    await replace(file, newPath);

    expect(await testPrisma.file.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({
      storagePath: newPath,
      fileName: "ny.pdf",
      size: 2048,
    });
    expect(storedKeys()).toEqual([newPath]);
  });

  it("is rejected when nothing was uploaded, and keeps the old content", async () => {
    const file = await storedFile();
    const { storagePath } = await createPieceFileReplaceUploadUrl(
      formData({
        groupSlug: group.slug,
        fileId: file.id,
        fileName: "ny.pdf",
        mimeType: "application/pdf",
        size: "2048",
      })
    );

    await expect(replace(file, storagePath)).rejects.toThrow("Filen hittades inte i lagringen");
    expect(await testPrisma.file.findUniqueOrThrow({ where: { id: file.id } })).toEqual(file);
    expect(storedKeys()).toEqual([file.storagePath]);
  });

  it("is rejected for its own current path, and keeps its content", async () => {
    const file = await storedFile();

    await expect(replace(file, file.storagePath)).rejects.toThrow("Filen finns redan");
    expect(storedKeys()).toEqual([file.storagePath]);
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

describe("downloading a File", () => {
  it("names the download with the File's name, encoded for any character", async () => {
    const file = await testPrisma.file.update({
      where: { id: (await storedFile()).id },
      data: { fileName: `Så "ända".pdf` },
    });

    const { downloadUrl } = await createPieceFileDownloadUrl(
      formData({ groupSlug: group.slug, fileId: file.id })
    );

    const disposition = new URL(downloadUrl).searchParams.get("disposition");
    expect(disposition).toContain(`filename*=UTF-8''S%C3%A5%20%22%C3%A4nda%22.pdf`);
  });
});
