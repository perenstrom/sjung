import { describe, expect, it } from "vitest";

import { testPrisma } from "../support/db";
import { createGroup, createPiece } from "../support/fixtures";
import {
  requireFileInGroup,
  requireLinkInGroup,
  requirePieceInGroup,
  requirePieceNoteInGroup,
  requireSetListInGroup,
  requireSetListPieceInGroup,
} from "@/lib/actions/guards";

describe("requirePieceInGroup", () => {
  it("allows a piece that belongs to the group", async () => {
    const piece = await createPiece();
    const resolved = await requirePieceInGroup(piece.id, piece.groupId);
    expect(resolved.id).toBe(piece.id);
  });

  it("denies a piece that belongs to a different group", async () => {
    const groupA = await createGroup();
    const pieceInB = await createPiece();
    await expect(requirePieceInGroup(pieceInB.id, groupA.id)).rejects.toThrow(
      "Stycke hittades inte"
    );
  });

  it("denies a missing piece id", async () => {
    const group = await createGroup();
    await expect(
      requirePieceInGroup("00000000-0000-0000-0000-000000000000", group.id)
    ).rejects.toThrow("Stycke hittades inte");
  });
});

describe("requireLinkInGroup", () => {
  it("allows a link on a piece within the group and denies one outside it", async () => {
    const piece = await createPiece();
    const link = await testPrisma.link.create({
      data: {
        pieceId: piece.id,
        url: "https://example.com",
        createdById: piece.createdById,
        updatedById: piece.createdById,
      },
    });

    const resolved = await requireLinkInGroup(link.id, piece.groupId);
    expect(resolved.id).toBe(link.id);

    const otherGroup = await createGroup();
    await expect(requireLinkInGroup(link.id, otherGroup.id)).rejects.toThrow(
      "Länk hittades inte"
    );
  });
});

describe("requireFileInGroup", () => {
  it("allows a file on a piece within the group and denies one outside it", async () => {
    const piece = await createPiece();
    const file = await testPrisma.file.create({
      data: {
        pieceId: piece.id,
        displayName: "Score",
        fileName: "score.pdf",
        storagePath: `groups/${piece.groupId}/pieces/${piece.id}/score.pdf`,
        mimeType: "application/pdf",
        size: 1024,
        createdById: piece.createdById,
        updatedById: piece.createdById,
      },
    });

    const resolved = await requireFileInGroup(file.id, piece.groupId);
    expect(resolved.id).toBe(file.id);

    const otherGroup = await createGroup();
    await expect(requireFileInGroup(file.id, otherGroup.id)).rejects.toThrow(
      "Fil hittades inte"
    );
  });
});

describe("requireSetListInGroup", () => {
  it("allows a set list within the group and denies one outside it", async () => {
    const group = await createGroup();
    const setList = await testPrisma.setList.create({
      data: {
        name: "Concert",
        groupId: group.id,
        createdById: group.createdById,
        updatedById: group.createdById,
      },
    });

    const resolved = await requireSetListInGroup(setList.id, group.id);
    expect(resolved.id).toBe(setList.id);

    const otherGroup = await createGroup();
    await expect(requireSetListInGroup(setList.id, otherGroup.id)).rejects.toThrow(
      "Repertoar hittades inte"
    );
  });
});

describe("requireSetListPieceInGroup", () => {
  it("allows a set list piece within the group and denies one outside it", async () => {
    const group = await createGroup();
    const piece = await createPiece({ groupId: group.id, createdById: group.createdById });
    const setList = await testPrisma.setList.create({
      data: {
        name: "Concert",
        groupId: group.id,
        createdById: group.createdById,
        updatedById: group.createdById,
      },
    });
    const setListPiece = await testPrisma.setListPiece.create({
      data: {
        setListId: setList.id,
        pieceId: piece.id,
        position: 1000,
        createdById: group.createdById,
        updatedById: group.createdById,
      },
    });

    const resolved = await requireSetListPieceInGroup(setListPiece.id, group.id);
    expect(resolved.id).toBe(setListPiece.id);

    const otherGroup = await createGroup();
    await expect(
      requireSetListPieceInGroup(setListPiece.id, otherGroup.id)
    ).rejects.toThrow("Repertoarpost hittades inte");
  });
});

describe("requirePieceNoteInGroup", () => {
  it("allows a piece note within the group and denies one outside it", async () => {
    const piece = await createPiece();
    const note = await testPrisma.pieceNote.create({
      data: {
        content: "Kom ihåg tempot",
        pieceId: piece.id,
        groupId: piece.groupId,
        createdById: piece.createdById,
        updatedById: piece.createdById,
      },
    });

    const resolved = await requirePieceNoteInGroup(note.id, piece.groupId);
    expect(resolved.id).toBe(note.id);

    const otherGroup = await createGroup();
    await expect(requirePieceNoteInGroup(note.id, otherGroup.id)).rejects.toThrow(
      "Anteckning hittades inte"
    );
  });
});
