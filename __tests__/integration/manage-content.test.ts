import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { Group } from "@/app/generated/prisma/client";
import { GroupClaim } from "@/app/generated/prisma/enums";
import * as fileActions from "@/app/actions/files";
import * as peopleActions from "@/app/actions/people";
import * as pieceActions from "@/app/actions/pieces";
import * as setListActions from "@/app/actions/setlists";
import { testPrisma } from "../support/db";
import {
  createFile,
  createGroup,
  createLink,
  createMember,
  createPerson,
  createPiece,
  createPieceNote,
  createSetList,
  createSetListNote,
  createSetListPiece,
} from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

const REFUSED = "Du har inte behörighet att ändra innehåll i gruppen";

/** Exported actions that only read content, so any Member may call them. */
const READS = new Set([
  "getPieces",
  "getPieceDetail",
  "listPieceNotes",
  "getPeople",
  "getSetLists",
  "getSetListDetail",
  "getSetListPieceOptions",
  "createPieceFileDownloadUrl",
]);

const ACTION_MODULES = { ...fileActions, ...peopleActions, ...pieceActions, ...setListActions };

/** One row of every kind of content in the Group, created by its Creator. */
async function seedContent(group: Group) {
  const piece = await createPiece({ groupId: group.id, createdById: group.createdById });
  const person = await createPerson(group);
  await testPrisma.personToPiece.create({
    data: { pieceId: piece.id, personId: person.id, role: "Kompositör" },
  });
  const setList = await createSetList(group);
  const setListPiece = await createSetListPiece(setList, piece, 1000);
  const setListNote = await createSetListNote(setList, "Paus", 2000);
  return {
    piece,
    person,
    setList,
    setListPiece,
    setListNote,
    file: await createFile(piece),
    link: await createLink(piece),
    pieceNote: await createPieceNote({ piece, createdById: group.createdById }),
  };
}

type Seeded = Awaited<ReturnType<typeof seedContent>>;

/** Valid input for every content action, so a refusal can only come from access. */
const CONTENT_ACTIONS: Record<string, (group: Group, c: Seeded) => FormData> = {
  createPiece: (g) => formData({ groupSlug: g.slug, name: "Kyrie" }),
  updatePiece: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, name: "Gloria" }),
  deletePiece: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id }),
  addLink: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, url: "https://example.org" }),
  updateLink: (g, c) => formData({ groupSlug: g.slug, linkId: c.link.id, url: "https://example.org" }),
  removeLink: (g, c) => formData({ groupSlug: g.slug, linkId: c.link.id }),
  addCredit: (g, c) =>
    formData({ groupSlug: g.slug, pieceId: c.piece.id, personId: c.person.id, role: "Arrangör" }),
  removeCredit: (g, c) =>
    formData({ groupSlug: g.slug, pieceId: c.piece.id, personId: c.person.id, role: "Kompositör" }),
  createPieceNote: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, content: "Andas" }),
  updatePieceNote: (g, c) =>
    formData({ groupSlug: g.slug, pieceNoteId: c.pieceNote.id, content: "Andas" }),
  deletePieceNote: (g, c) => formData({ groupSlug: g.slug, pieceNoteId: c.pieceNote.id }),
  createPieceFileUploadUrl: (g, c) =>
    formData({
      groupSlug: g.slug,
      pieceId: c.piece.id,
      fileName: "score.pdf",
      mimeType: "application/pdf",
      size: "1024",
    }),
  finalizePieceFileUpload: (g, c) =>
    formData({
      groupSlug: g.slug,
      pieceId: c.piece.id,
      fileName: "score.pdf",
      storagePath: `groups/${g.id}/pieces/${c.piece.id}/new-score.pdf`,
      mimeType: "application/pdf",
      size: "1024",
    }),
  createPieceFileReplaceUploadUrl: (g, c) =>
    formData({
      groupSlug: g.slug,
      fileId: c.file.id,
      fileName: "score.pdf",
      mimeType: "application/pdf",
      size: "1024",
    }),
  finalizePieceFileReplace: (g, c) =>
    formData({
      groupSlug: g.slug,
      fileId: c.file.id,
      fileName: "score.pdf",
      storagePath: `groups/${g.id}/pieces/${c.piece.id}/new-score.pdf`,
      mimeType: "application/pdf",
      size: "1024",
    }),
  updatePieceFileDisplayName: (g, c) =>
    formData({ groupSlug: g.slug, fileId: c.file.id, displayName: "Partitur" }),
  deletePieceFile: (g, c) => formData({ groupSlug: g.slug, fileId: c.file.id }),
  createSetList: (g) => formData({ groupSlug: g.slug, name: "Julkonsert" }),
  updateSetList: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id, name: "Vårkonsert" }),
  deleteSetList: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id }),
  addPieceToSetList: (g, c) =>
    formData({ groupSlug: g.slug, setListId: c.setList.id, pieceId: c.piece.id }),
  removePieceFromSetList: (g, c) =>
    formData({ groupSlug: g.slug, setListPieceId: c.setListPiece.id }),
  reorderSetListSteps: (g, c) =>
    formData({
      groupSlug: g.slug,
      setListId: c.setList.id,
      orderedSetListStepIds: JSON.stringify([c.setListNote.id, c.setListPiece.id]),
    }),
  appendSetListNote: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id, content: "Paus" }),
  deleteSetListNote: (g, c) => formData({ groupSlug: g.slug, setListNoteId: c.setListNote.id }),
  createPerson: (g) => formData({ groupSlug: g.slug, name: "Hugo Alfvén" }),
};

function action(name: string): (fd: FormData) => Promise<unknown> {
  return ACTION_MODULES[name as keyof typeof ACTION_MODULES] as (fd: FormData) => Promise<unknown>;
}

describe("content actions require manageContent", () => {
  let group: Group;
  let content: Seeded;

  beforeEach(async () => {
    group = await createGroup();
    content = await seedContent(group);
  });

  it("the sweep lists every exported content action", () => {
    const writes = Object.keys(ACTION_MODULES).filter((name) => !READS.has(name));
    expect(writes.sort()).toEqual(Object.keys(CONTENT_ACTIONS).sort());
  });

  it.each(Object.keys(CONTENT_ACTIONS))(
    "%s refuses a Member without MANAGE_CONTENT",
    async (name) => {
      actAs((await createMember(group, [GroupClaim.MANAGE_MEMBERS])).id);

      await expect(action(name)(CONTENT_ACTIONS[name](group, content))).rejects.toThrow(REFUSED);
    }
  );

  it.each(Object.keys(CONTENT_ACTIONS))("%s refuses a Member with no Claims", async (name) => {
    actAs((await createMember(group, [])).id);

    await expect(action(name)(CONTENT_ACTIONS[name](group, content))).rejects.toThrow(REFUSED);
  });

  describe("a MANAGE_CONTENT Member", () => {
    beforeEach(async () => {
      actAs((await createMember(group, [GroupClaim.MANAGE_CONTENT])).id);
    });

    it("changes a Piece", async () => {
      await pieceActions.updatePiece(CONTENT_ACTIONS.updatePiece(group, content));
      expect(await testPrisma.piece.findUniqueOrThrow({ where: { id: content.piece.id } })).toMatchObject({
        name: "Gloria",
      });
    });

    it("changes a File", async () => {
      await fileActions.updatePieceFileDisplayName(CONTENT_ACTIONS.updatePieceFileDisplayName(group, content));
      expect(await testPrisma.file.findUniqueOrThrow({ where: { id: content.file.id } })).toMatchObject({
        displayName: "Partitur",
      });
    });

    it("adds a Link", async () => {
      await pieceActions.addLink(CONTENT_ACTIONS.addLink(group, content));
      expect(await testPrisma.link.count({ where: { pieceId: content.piece.id } })).toBe(2);
    });

    it("adds a Credit", async () => {
      await pieceActions.addCredit(CONTENT_ACTIONS.addCredit(group, content));
      expect(await testPrisma.personToPiece.count({ where: { pieceId: content.piece.id } })).toBe(2);
    });

    it("adds a Piece note", async () => {
      await pieceActions.createPieceNote(CONTENT_ACTIONS.createPieceNote(group, content));
      expect(await testPrisma.pieceNote.count({ where: { pieceId: content.piece.id } })).toBe(2);
    });

    it("creates a Set list", async () => {
      await setListActions.createSetList(CONTENT_ACTIONS.createSetList(group, content));
      expect(await testPrisma.setList.count({ where: { groupId: group.id } })).toBe(2);
    });

    it("adds a Set list step", async () => {
      await setListActions.appendSetListNote(CONTENT_ACTIONS.appendSetListNote(group, content));
      expect(await testPrisma.setListNote.count({ where: { setListId: content.setList.id } })).toBe(2);
    });

    it("creates a Person", async () => {
      await peopleActions.createPerson(CONTENT_ACTIONS.createPerson(group, content));
      expect(await testPrisma.person.count({ where: { groupId: group.id } })).toBe(2);
    });
  });
});
