import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import type { Group, Piece, SetList } from "@/app/generated/prisma/client";
import { getPieceDetail } from "@/app/actions/pieces";
import { removePieceFromWholeSetList } from "@/app/actions/setlists";
import { testPrisma } from "../support/db";
import {
  createGroup,
  createPiece,
  createSetList,
  createSetListNote,
  createSetListPiece,
} from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

describe("a Piece in the same Set list more than once", () => {
  let group: Group;
  let piece: Piece;
  let setListA: SetList;
  let setListB: SetList;

  beforeEach(async () => {
    group = await createGroup();
    actAs(group.createdById);
    piece = await createPiece({ groupId: group.id, createdById: group.createdById });
    setListA = await createSetList(group, "Julkonsert");
    setListB = await createSetList(group, "Allsång");
    await createSetListPiece(setListA, piece, 1000);
    await createSetListPiece(setListA, piece, 3000);
    await createSetListPiece(setListB, piece, 1000);
  });

  it("is listed once per Set list on the Piece page", async () => {
    const detail = await getPieceDetail(group.slug, piece.id);

    expect(detail?.setLists).toEqual([
      { setListId: setListB.id, setListName: "Allsång" },
      { setListId: setListA.id, setListName: "Julkonsert" },
    ]);
  });

  it("is removed from every place in that Set list, leaving the rest alone", async () => {
    const otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });
    const otherStep = await createSetListPiece(setListA, otherPiece, 2000);
    const note = await createSetListNote(setListA, "Paus", 4000);

    await removePieceFromWholeSetList(
      formData({ groupSlug: group.slug, setListId: setListA.id, pieceId: piece.id })
    );

    const remaining = await testPrisma.setListPiece.findMany({ select: { id: true, setListId: true } });
    expect(remaining).toEqual(
      expect.arrayContaining([
        { id: otherStep.id, setListId: setListA.id },
        { id: expect.any(String), setListId: setListB.id },
      ])
    );
    expect(remaining).toHaveLength(2);
    expect(await testPrisma.setListNote.count({ where: { id: note.id } })).toBe(1);
  });

  it.each([
    ["Set list", "Repertoar hittades inte", "setListId"],
    ["Piece", "Stycke hittades inte", "pieceId"],
  ] as const)("refuses a %s from another Group", async (_, message, field) => {
    const other = await createGroup();
    const foreign = {
      setListId: (await createSetList(other)).id,
      pieceId: (await createPiece({ groupId: other.id, createdById: other.createdById })).id,
    };

    await expect(
      removePieceFromWholeSetList(
        formData({
          groupSlug: group.slug,
          setListId: setListA.id,
          pieceId: piece.id,
          [field]: foreign[field],
        })
      )
    ).rejects.toThrow(message);
    expect(await testPrisma.setListPiece.count()).toBe(3);
  });
});
