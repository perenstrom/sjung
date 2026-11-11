import { describe, expect, it } from "vitest";

import type { Group } from "@/app/generated/prisma/client";
import { findInGroup, type ContentKind } from "@/lib/find-in-group";
import {
  createFile,
  createGroup,
  createLink,
  createPerson,
  createPiece,
  createPieceNote,
  createSetList,
  createSetListNote,
  createSetListPiece,
} from "../support/fixtures";

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

async function pieceIn(group: Group) {
  return createPiece({ groupId: group.id, createdById: group.createdById });
}

/** How to make one row of each kind in a Group, and what a refusal says. */
const KINDS: Record<ContentKind, { create: (group: Group) => Promise<{ id: string }>; notFound: string }> = {
  piece: { create: pieceIn, notFound: "Stycke hittades inte" },
  setList: { create: (group) => createSetList(group), notFound: "Repertoar hittades inte" },
  setListPiece: {
    create: async (group) => createSetListPiece(await createSetList(group), await pieceIn(group)),
    notFound: "Repertoarpost hittades inte",
  },
  setListNote: {
    create: async (group) => createSetListNote(await createSetList(group)),
    notFound: "Anteckning hittades inte",
  },
  file: { create: async (group) => createFile(await pieceIn(group)), notFound: "Fil hittades inte" },
  link: { create: async (group) => createLink(await pieceIn(group)), notFound: "Länk hittades inte" },
  pieceNote: {
    create: async (group) =>
      createPieceNote({ piece: await pieceIn(group), createdById: group.createdById }),
    notFound: "Anteckning hittades inte",
  },
  person: { create: (group) => createPerson(group), notFound: "Person hittades inte" },
};

describe.each(Object.entries(KINDS) as [ContentKind, (typeof KINDS)[ContentKind]][])(
  "findInGroup(%s)",
  (kind, { create, notFound }) => {
    it("returns the row when it is in the Group", async () => {
      const group = await createGroup();
      const row = await create(group);

      await expect(findInGroup(group.id, kind, row.id)).resolves.toEqual({ id: row.id });
    });

    it("refuses a row in another Group", async () => {
      const group = await createGroup();
      const row = await create(await createGroup());

      await expect(findInGroup(group.id, kind, row.id)).rejects.toThrow(notFound);
    });

    it("refuses a missing row", async () => {
      const group = await createGroup();

      await expect(findInGroup(group.id, kind, MISSING_ID)).rejects.toThrow(notFound);
    });
  }
);

describe("findInGroup with a select", () => {
  it("returns the selected fields", async () => {
    const group = await createGroup();
    const piece = await pieceIn(group);
    const file = await createFile(piece);

    const found = await findInGroup(group.id, "file", file.id, {
      select: { pieceId: true, storagePath: true },
    });

    expect(found).toEqual({ pieceId: piece.id, storagePath: file.storagePath });
  });
});
