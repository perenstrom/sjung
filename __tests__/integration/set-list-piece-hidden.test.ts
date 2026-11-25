import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import type { File, Group, Link, Piece, SetList, SetListPiece } from "@/app/generated/prisma/client";
import { GroupClaim } from "@/app/generated/prisma/enums";
import { createPieceFileReplaceUploadUrl, deletePieceFile, finalizePieceFileReplace } from "@/app/actions/files";
import { removeLink } from "@/app/actions/pieces";
import {
  getSetListDetail,
  getSetListPieceContext,
  hideOnSetListPiece,
  unhideOnSetListPiece,
} from "@/app/actions/setlists";
import type { SetListPieceStep } from "@/lib/setlists/types";
import { testPrisma } from "../support/db";
import { putStoredObject } from "../support/fake-object-storage";
import {
  createFile,
  createGroup,
  createLink,
  createMember,
  createPiece,
  createSetList,
  createSetListPiece,
} from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

let group: Group;
let piece: Piece;
let file: File;
let link: Link;
let setList: SetList;
let first: SetListPiece;
let second: SetListPiece;

beforeEach(async () => {
  group = await createGroup();
  actAs((await createMember(group, [GroupClaim.MANAGE_CONTENT])).id);
  piece = await createPiece({ groupId: group.id, createdById: group.createdById });
  file = await createFile(piece);
  putStoredObject(file.storagePath);
  link = await createLink(piece);
  setList = await createSetList(group, "Julkonsert");
  // The same Piece twice in one Set list: each appearance is hidden separately.
  first = await createSetListPiece(setList, piece, 1000);
  second = await createSetListPiece(setList, piece, 2000);
});

type Item = { fileId: string } | { linkId: string };

function hide(setListPiece: { id: string }, item: Item) {
  return hideOnSetListPiece(formData({ groupSlug: group.slug, setListPieceId: setListPiece.id, ...item }));
}

function unhide(setListPiece: { id: string }, item: Item) {
  return unhideOnSetListPiece(formData({ groupSlug: group.slug, setListPieceId: setListPiece.id, ...item }));
}

/** What the Set list view is told is hidden on each of its Set list pieces, by Set list piece id. */
async function hiddenBySetListPiece(onSetList: SetList = setList) {
  const detail = await getSetListDetail(group.slug, onSetList.id);
  const pieces = (detail?.steps ?? []).filter((step): step is SetListPieceStep => step.kind === "piece");
  return Object.fromEntries(
    pieces.map((step) => [step.id, { fileIds: step.hiddenFileIds, linkIds: step.hiddenLinkIds }]),
  );
}

describe("hiding Files and Links on a Set list piece", () => {
  it("hides a File and a Link on that Set list piece only", async () => {
    const otherSetList = await createSetList(group, "Allsång");
    const elsewhere = await createSetListPiece(otherSetList, piece, 1000);

    await hide(first, { fileId: file.id });
    await hide(first, { linkId: link.id });

    expect(await hiddenBySetListPiece()).toEqual({
      [first.id]: { fileIds: [file.id], linkIds: [link.id] },
      [second.id]: { fileIds: [], linkIds: [] },
    });
    expect(await hiddenBySetListPiece(otherSetList)).toEqual({ [elsewhere.id]: { fileIds: [], linkIds: [] } });
  });

  it("unhides them again", async () => {
    await hide(first, { fileId: file.id });
    await hide(first, { linkId: link.id });

    await unhide(first, { fileId: file.id });
    await unhide(first, { linkId: link.id });

    expect(await hiddenBySetListPiece()).toEqual({
      [first.id]: { fileIds: [], linkIds: [] },
      [second.id]: { fileIds: [], linkIds: [] },
    });
  });

  it("takes hiding what is already hidden, and unhiding what isn't, as done", async () => {
    await hide(first, { fileId: file.id });
    await hide(first, { fileId: file.id });
    await unhide(second, { linkId: link.id });

    expect((await hiddenBySetListPiece())[first.id]).toEqual({ fileIds: [file.id], linkIds: [] });
  });

  it.each([
    ["a File of another Piece", "Fil hittades inte", async () => ({ fileId: (await otherPieceItems()).file.id })],
    ["a Link of another Piece", "Länk hittades inte", async () => ({ linkId: (await otherPieceItems()).link.id })],
    ["a File in another Group", "Fil hittades inte", async () => ({ fileId: (await otherGroupItems()).file.id })],
    ["a Link in another Group", "Länk hittades inte", async () => ({ linkId: (await otherGroupItems()).link.id })],
    ["no File or Link", "Fil eller länk saknas", async () => ({}) as Item],
  ])("refuses %s", async (_, message, item) => {
    const target = await item();

    await expect(hide(first, target)).rejects.toThrow(message);
    await expect(unhide(first, target)).rejects.toThrow(message);
    expect(await testPrisma.setListPieceHiddenFile.count()).toBe(0);
    expect(await testPrisma.setListPieceHiddenLink.count()).toBe(0);
  });

  it("refuses a Set list piece in another Group", async () => {
    const other = await otherGroupItems();

    await expect(hide(other.setListPiece, { fileId: other.file.id })).rejects.toThrow("Repertoarpost hittades inte");
    expect(await testPrisma.setListPieceHiddenFile.count()).toBe(0);
  });

  it("keeps a File hidden when its content is replaced, and forgets the hide when it is deleted", async () => {
    await hide(first, { fileId: file.id });
    await hide(first, { linkId: link.id });

    const { storagePath } = await createPieceFileReplaceUploadUrl(
      formData({
        groupSlug: group.slug,
        fileId: file.id,
        fileName: "ny.pdf",
        mimeType: "application/pdf",
        size: "2048",
      }),
    );
    putStoredObject(storagePath, { size: 2048, contentType: "application/pdf" });
    await finalizePieceFileReplace(
      formData({
        groupSlug: group.slug,
        fileId: file.id,
        fileName: "ny.pdf",
        storagePath,
        mimeType: "application/pdf",
        size: "2048",
      }),
    );
    expect((await hiddenBySetListPiece())[first.id]).toEqual({ fileIds: [file.id], linkIds: [link.id] });

    await deletePieceFile(formData({ groupSlug: group.slug, fileId: file.id }));
    await removeLink(formData({ groupSlug: group.slug, linkId: link.id }));
    expect((await hiddenBySetListPiece())[first.id]).toEqual({ fileIds: [], linkIds: [] });
  });
});

describe("a Piece's page opened from a Set list piece", () => {
  it("knows the Set list piece's Set list and what is hidden on it", async () => {
    await hide(second, { fileId: file.id });
    await hide(second, { linkId: link.id });

    expect(await getSetListPieceContext(group.slug, piece.id, second.id)).toEqual({
      id: second.id,
      setList: { id: setList.id, slug: setList.slug, name: "Julkonsert" },
      hiddenFileIds: [file.id],
      hiddenLinkIds: [link.id],
    });
    expect(await getSetListPieceContext(group.slug, piece.id, first.id)).toMatchObject({
      hiddenFileIds: [],
      hiddenLinkIds: [],
    });
  });

  it.each([
    ["a Set list piece that no longer exists", async () => "00000000-0000-4000-8000-000000000000"],
    [
      "another Piece's Set list piece",
      async () => {
        const otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });
        return (await createSetListPiece(setList, otherPiece, 3000)).id;
      },
    ],
    ["a Set list piece in another Group", async () => (await otherGroupItems()).setListPiece.id],
  ])("has no Set list context for %s", async (_, setListPieceId) => {
    expect(await getSetListPieceContext(group.slug, piece.id, await setListPieceId())).toBeNull();
  });
});

async function otherPieceItems() {
  const otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });
  return { file: await createFile(otherPiece), link: await createLink(otherPiece) };
}

async function otherGroupItems() {
  const other = await createGroup();
  const otherPiece = await createPiece({ groupId: other.id, createdById: other.createdById });
  const otherSetList = await createSetList(other);
  return {
    file: await createFile(otherPiece),
    link: await createLink(otherPiece),
    setListPiece: await createSetListPiece(otherSetList, otherPiece),
  };
}
