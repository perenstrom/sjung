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
  createPieceAlias,
  createPieceNote,
  createSetList,
  createSetListNote,
  createSetListPiece,
} from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

const REFUSED = "Du har inte behörighet att ändra innehåll i gruppen";
const REORDER_REFUSED = "Du har inte behörighet att ändra ordning i gruppens repertoarer";
const NOTES_REFUSED = "Du har inte behörighet att hantera anteckningar i gruppens repertoarer";

const REORDER = "reorderSetListSteps";

/**
 * The content actions a fine-grained Claim also allows (ADR-0012), and what a
 * Member holding neither it nor `MANAGE_CONTENT` is told.
 */
const ALSO_ALLOWED_BY: Record<string, { claim: GroupClaim; refused: string }> = {
  [REORDER]: { claim: GroupClaim.REORDER_SET_LISTS, refused: REORDER_REFUSED },
  appendSetListNote: { claim: GroupClaim.MANAGE_RUNNING_ORDER_NOTES, refused: NOTES_REFUSED },
  updateSetListNote: { claim: GroupClaim.MANAGE_RUNNING_ORDER_NOTES, refused: NOTES_REFUSED },
  deleteSetListNote: { claim: GroupClaim.MANAGE_RUNNING_ORDER_NOTES, refused: NOTES_REFUSED },
};

const FINE_GRAINED_CLAIMS = [GroupClaim.REORDER_SET_LISTS, GroupClaim.MANAGE_RUNNING_ORDER_NOTES];

function refusalFor(name: string): string {
  return ALSO_ALLOWED_BY[name]?.refused ?? REFUSED;
}

/** Exported actions that only read content, so any Member may call them. */
const READS = new Set([
  "getPieces",
  "getPieceDetail",
  "getCreditRoles",
  "getCategories",
  "getPieceImportGroup",
  "listPieceNotes",
  "getPeople",
  "getPeopleWithPieceCounts",
  "getPersonDetail",
  "getSetLists",
  "getCurrentSetLists",
  "getSetListDetail",
  "getSetListPieceContext",
  "getSetListPieceOptions",
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
    pieceAlias: await createPieceAlias(piece, "Julsången"),
    pieceNote: await createPieceNote({ piece, createdById: group.createdById }),
  };
}

type Seeded = Awaited<ReturnType<typeof seedContent>>;

/** Valid input for every content action, so a refusal can only come from access. */
const CONTENT_ACTIONS: Record<string, (group: Group, c: Seeded) => FormData> = {
  createPiece: (g) => formData({ groupSlug: g.slug, name: "Kyrie" }),
  updatePiece: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, name: "Gloria" }),
  deletePiece: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id }),
  addPieceAlias: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, name: "Den långa" }),
  removePieceAlias: (g, c) => formData({ groupSlug: g.slug, pieceAliasId: c.pieceAlias.id }),
  addLink: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, url: "https://example.org" }),
  updateLink: (g, c) => formData({ groupSlug: g.slug, linkId: c.link.id, url: "https://example.org" }),
  removeLink: (g, c) => formData({ groupSlug: g.slug, linkId: c.link.id }),
  addCredits: (g, c) =>
    formData({
      groupSlug: g.slug,
      pieceId: c.piece.id,
      personId: c.person.id,
      roles: JSON.stringify(["Arrangör", "Dirigent"]),
    }),
  removePersonCredits: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, personId: c.person.id }),
  createPieceNote: (g, c) => formData({ groupSlug: g.slug, pieceId: c.piece.id, content: "Andas" }),
  updatePieceNote: (g, c) => formData({ groupSlug: g.slug, pieceNoteId: c.pieceNote.id, content: "Andas" }),
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
  updatePieceFileDisplayName: (g, c) => formData({ groupSlug: g.slug, fileId: c.file.id, displayName: "Partitur" }),
  deletePieceFile: (g, c) => formData({ groupSlug: g.slug, fileId: c.file.id }),
  retryPieceFileConversion: (g, c) => formData({ groupSlug: g.slug, fileId: c.file.id }),
  createSetList: (g) => formData({ groupSlug: g.slug, name: "Julkonsert" }),
  updateSetList: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id, name: "Vårkonsert" }),
  deleteSetList: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id }),
  addPieceToSetList: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id, pieceId: c.piece.id }),
  removePieceFromSetList: (g, c) => formData({ groupSlug: g.slug, setListPieceId: c.setListPiece.id }),
  removePieceFromWholeSetList: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id, pieceId: c.piece.id }),
  reorderSetListSteps: (g, c) =>
    formData({
      groupSlug: g.slug,
      setListId: c.setList.id,
      orderedSetListStepIds: JSON.stringify([c.setListNote.id, c.setListPiece.id]),
    }),
  hideOnSetListPiece: (g, c) => formData({ groupSlug: g.slug, setListPieceId: c.setListPiece.id, fileId: c.file.id }),
  unhideOnSetListPiece: (g, c) => formData({ groupSlug: g.slug, setListPieceId: c.setListPiece.id, linkId: c.link.id }),
  appendSetListNote: (g, c) => formData({ groupSlug: g.slug, setListId: c.setList.id, content: "Paus" }),
  updateSetListNote: (g, c) =>
    formData({ groupSlug: g.slug, setListNoteId: c.setListNote.id, content: "Paus, tio minuter" }),
  deleteSetListNote: (g, c) => formData({ groupSlug: g.slug, setListNoteId: c.setListNote.id }),
  createPerson: (g) => formData({ groupSlug: g.slug, name: "Hugo Alfvén" }),
  renamePerson: (g, c) => formData({ groupSlug: g.slug, personId: c.person.id, name: "Hugo Alfvén" }),
  deletePerson: (g, c) => formData({ groupSlug: g.slug, personId: c.person.id }),
  importPieces: (g) =>
    formData({
      groupSlug: g.slug,
      text: "Titel\nKyrie",
      choices: JSON.stringify({ columns: {}, addDuplicateLines: [] }),
      outcome: "",
    }),
};

function action(name: string): (fd: FormData) => Promise<unknown> {
  return ACTION_MODULES[name as keyof typeof ACTION_MODULES] as (fd: FormData) => Promise<unknown>;
}

async function runningOrder(setListId: string): Promise<string[]> {
  const [pieces, notes] = await Promise.all([
    testPrisma.setListPiece.findMany({ where: { setListId }, select: { id: true, position: true } }),
    testPrisma.setListNote.findMany({ where: { setListId }, select: { id: true, position: true } }),
  ]);
  return [...pieces, ...notes].sort((a, b) => a.position - b.position).map((step) => step.id);
}

describe("content actions require manageContent, or the fine-grained Claim that also allows them", () => {
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

  it.each(Object.keys(CONTENT_ACTIONS))("%s refuses a Member without MANAGE_CONTENT", async (name) => {
    actAs((await createMember(group, [GroupClaim.MANAGE_MEMBERS])).id);

    await expect(action(name)(CONTENT_ACTIONS[name](group, content))).rejects.toThrow(refusalFor(name));
  });

  it.each(Object.keys(CONTENT_ACTIONS))("%s refuses a Member with no Claims", async (name) => {
    actAs((await createMember(group, [])).id);

    await expect(action(name)(CONTENT_ACTIONS[name](group, content))).rejects.toThrow(refusalFor(name));
  });

  it.each(
    FINE_GRAINED_CLAIMS.flatMap((claim) =>
      Object.keys(CONTENT_ACTIONS)
        .filter((name) => ALSO_ALLOWED_BY[name]?.claim !== claim)
        .map((name) => [name, claim] as const),
    ),
  )("%s refuses a Member with only %s", async (name, claim) => {
    actAs((await createMember(group, [claim])).id);

    await expect(action(name)(CONTENT_ACTIONS[name](group, content))).rejects.toThrow(refusalFor(name));
  });

  it.each<[string, boolean, () => Promise<string>]>([
    ["REORDER_SET_LISTS", false, async () => (await createMember(group, [GroupClaim.REORDER_SET_LISTS])).id],
    ["REORDER_SET_LISTS", true, async () => (await createMember(group, [GroupClaim.REORDER_SET_LISTS])).id],
    ["MANAGE_CONTENT", false, async () => (await createMember(group, [GroupClaim.MANAGE_CONTENT])).id],
    ["the Creator", false, async () => group.createdById],
  ])("a Member holding %s reorders a Set list (Current: %s)", async (_label, current, member) => {
    await testPrisma.setList.update({ where: { id: content.setList.id }, data: { current } });
    actAs(await member());

    await setListActions.reorderSetListSteps(CONTENT_ACTIONS[REORDER](group, content));

    expect(await runningOrder(content.setList.id)).toEqual([content.setListNote.id, content.setListPiece.id]);
  });

  it.each<[string, boolean, () => Promise<string>]>([
    [
      "MANAGE_RUNNING_ORDER_NOTES",
      false,
      async () => (await createMember(group, [GroupClaim.MANAGE_RUNNING_ORDER_NOTES])).id,
    ],
    [
      "MANAGE_RUNNING_ORDER_NOTES",
      true,
      async () => (await createMember(group, [GroupClaim.MANAGE_RUNNING_ORDER_NOTES])).id,
    ],
    ["MANAGE_CONTENT", false, async () => (await createMember(group, [GroupClaim.MANAGE_CONTENT])).id],
    ["the Creator", false, async () => group.createdById],
  ])(
    "a Member holding %s adds, edits and deletes a Running-order note (Current: %s)",
    async (_label, current, member) => {
      await testPrisma.setList.update({ where: { id: content.setList.id }, data: { current } });
      actAs(await member());

      await setListActions.appendSetListNote(CONTENT_ACTIONS.appendSetListNote(group, content));
      await setListActions.updateSetListNote(CONTENT_ACTIONS.updateSetListNote(group, content));
      await setListActions.deleteSetListNote(CONTENT_ACTIONS.deleteSetListNote(group, content));

      expect(
        await testPrisma.setListNote.findMany({ where: { setListId: content.setList.id }, select: { content: true } }),
      ).toEqual([{ content: "Paus" }]);
      expect(await testPrisma.setListNote.count({ where: { id: content.setListNote.id } })).toBe(0);
    },
  );

  describe("a MANAGE_CONTENT Member", () => {
    let currentUserId: string;

    beforeEach(async () => {
      currentUserId = (await createMember(group, [GroupClaim.MANAGE_CONTENT])).id;
      actAs(currentUserId);
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

    it("adds Credits", async () => {
      await pieceActions.addCredits(CONTENT_ACTIONS.addCredits(group, content));
      expect(await testPrisma.personToPiece.count({ where: { pieceId: content.piece.id } })).toBe(3);
    });

    it("adds a Piece note", async () => {
      await pieceActions.createPieceNote(CONTENT_ACTIONS.createPieceNote(group, content));
      expect(await testPrisma.pieceNote.count({ where: { pieceId: content.piece.id } })).toBe(2);
    });

    it("creates a Set list, marked Current when Aktuell is checked", async () => {
      await setListActions.createSetList(CONTENT_ACTIONS.createSetList(group, content));
      await setListActions.createSetList(formData({ groupSlug: group.slug, name: "Lucia", current: "on" }));
      expect(
        await testPrisma.setList.findMany({
          where: { groupId: group.id, name: { in: ["Julkonsert", "Lucia"] } },
          orderBy: { name: "asc" },
          select: { name: true, current: true },
        }),
      ).toEqual([
        { name: "Julkonsert", current: false },
        { name: "Lucia", current: true },
      ]);
    });

    it.each([
      ["marks a Set list Current", { current: "on" }, true],
      ["unmarks a Current Set list", {}, false],
    ])("%s", async (_, fields, current) => {
      await testPrisma.setList.update({ where: { id: content.setList.id }, data: { current: !current } });

      await setListActions.updateSetList(
        formData({ groupSlug: group.slug, setListId: content.setList.id, name: "Vårkonsert", ...fields }),
      );

      expect(await testPrisma.setList.findUniqueOrThrow({ where: { id: content.setList.id } })).toMatchObject({
        name: "Vårkonsert",
        current,
      });
    });

    it("adds a Set list step", async () => {
      await setListActions.appendSetListNote(CONTENT_ACTIONS.appendSetListNote(group, content));
      expect(await testPrisma.setListNote.count({ where: { setListId: content.setList.id } })).toBe(2);
    });

    it("changes a Running-order note's text without moving it", async () => {
      const orderBefore = await runningOrder(content.setList.id);
      await setListActions.updateSetListNote(CONTENT_ACTIONS.updateSetListNote(group, content));

      expect(await testPrisma.setListNote.findUniqueOrThrow({ where: { id: content.setListNote.id } })).toMatchObject({
        content: "Paus, tio minuter",
        updatedById: currentUserId,
      });
      expect(await runningOrder(content.setList.id)).toEqual(orderBefore);
    });

    it("refuses blank Running-order note text and keeps the note", async () => {
      await expect(
        setListActions.updateSetListNote(
          formData({ groupSlug: group.slug, setListNoteId: content.setListNote.id, content: "   " }),
        ),
      ).rejects.toThrow("Anteckning krävs");

      expect(await testPrisma.setListNote.findUniqueOrThrow({ where: { id: content.setListNote.id } })).toMatchObject({
        content: "Paus",
      });
    });

    it("refuses to change another Group's Running-order note", async () => {
      const otherNote = await createSetListNote(await createSetList(await createGroup()), "Paus", 1000);

      await expect(
        setListActions.updateSetListNote(
          formData({ groupSlug: group.slug, setListNoteId: otherNote.id, content: "Kapad" }),
        ),
      ).rejects.toThrow("Anteckning hittades inte");

      expect(await testPrisma.setListNote.findUniqueOrThrow({ where: { id: otherNote.id } })).toMatchObject({
        content: "Paus",
      });
    });

    it("creates a Person", async () => {
      await peopleActions.createPerson(CONTENT_ACTIONS.createPerson(group, content));
      expect(await testPrisma.person.count({ where: { groupId: group.id } })).toBe(2);
    });
  });
});
