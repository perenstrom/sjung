import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { Group, Piece } from "@/app/generated/prisma/client";
import { GroupClaim } from "@/app/generated/prisma/enums";
import {
  createPieceFileUploadUrl,
  finalizePieceFileUpload,
  updatePieceFileDisplayName,
} from "@/app/actions/files";
import { addLink, getCategories, removeLink, updateLink } from "@/app/actions/pieces";
import { testPrisma } from "../support/db";
import { putStoredObject } from "../support/fake-object-storage";
import { createFile, createGroup, createLink, createMember, createPiece } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

let group: Group;
let piece: Piece;

beforeEach(async () => {
  group = await createGroup();
  piece = await createPiece({ groupId: group.id, createdById: group.createdById });
  actAs((await createMember(group, [GroupClaim.MANAGE_CONTENT])).id);
});

async function uploadFile(category?: string) {
  const { storagePath } = await createPieceFileUploadUrl(
    formData({ groupSlug: group.slug, pieceId: piece.id, fileName: "a.pdf", mimeType: "application/pdf", size: "10" })
  );
  putStoredObject(storagePath);
  await finalizePieceFileUpload(
    formData({
      groupSlug: group.slug,
      pieceId: piece.id,
      fileName: "a.pdf",
      storagePath,
      ...(category === undefined ? {} : { category }),
    })
  );
  return testPrisma.file.findFirstOrThrow({ where: { storagePath } });
}

async function categoryInUse(category: string) {
  const other = await createPiece({ groupId: group.id, createdById: group.createdById });
  return createLink(other, undefined, category);
}

describe("a File's Category", () => {
  it("is saved when uploading, in the spelling already in use", async () => {
    await categoryInUse("Stämmor");

    expect((await uploadFile("  stämmor ")).category).toBe("Stämmor");
  });

  it("is none when uploading without one", async () => {
    expect((await uploadFile()).category).toBeNull();
  });

  it.each([
    ["changed", "noter", "Noter"],
    ["cleared", "", null],
    ["cleared by Övrigt", " övrigt ", null],
  ])("can be %s when renaming", async (_case, category, expected) => {
    const file = await createFile(piece, "Texter");

    await updatePieceFileDisplayName(
      formData({ groupSlug: group.slug, fileId: file.id, displayName: "Ny", category })
    );

    expect(await testPrisma.file.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({
      displayName: "Ny",
      category: expected,
    });
  });
});

describe("a Link's Category", () => {
  it("is saved when adding, in the spelling already in use", async () => {
    await addLink(formData({ groupSlug: group.slug, pieceId: piece.id, url: "https://a.se", category: "INSPELNINGAR" }));

    expect(await testPrisma.link.findFirstOrThrow({ where: { pieceId: piece.id } })).toMatchObject({
      category: "Inspelningar",
    });
  });

  it.each([
    ["changed", "Texter", "Texter"],
    ["cleared", "", null],
    ["cleared by Övrigt", "Övrigt", null],
  ])("can be %s when editing", async (_case, category, expected) => {
    const link = await createLink(piece);

    await updateLink(formData({ groupSlug: group.slug, linkId: link.id, url: "https://b.se", category }));

    expect(await testPrisma.link.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({
      url: "https://b.se/",
      category: expected,
    });
  });
});

describe("the Group's Categories", () => {
  it("are the built-ins, then the Categories its Files and Links use, alphabetically", async () => {
    await categoryInUse("Texter");
    await createFile(piece, "Ackord");

    expect(await getCategories(group.slug)).toEqual(["Noter", "Övningsfiler", "Inspelningar", "Ackord", "Texter"]);
  });

  it("stop offering a Category once nothing in the Group uses it", async () => {
    const link = await categoryInUse("Texter");
    await removeLink(formData({ groupSlug: group.slug, linkId: link.id }));

    expect(await getCategories(group.slug)).toEqual(["Noter", "Övningsfiler", "Inspelningar"]);
  });

  it("leave out other Groups' Categories", async () => {
    const otherGroup = await createGroup();
    const otherPiece = await createPiece({ groupId: otherGroup.id, createdById: otherGroup.createdById });
    await createLink(otherPiece, undefined, "Hemligt");

    expect(await getCategories(group.slug)).toEqual(["Noter", "Övningsfiler", "Inspelningar"]);
  });
});
