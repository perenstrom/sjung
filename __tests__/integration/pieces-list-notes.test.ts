import { beforeEach, describe, expect, it } from "vitest";

import type { Group, Piece, SetList } from "@/app/generated/prisma/client";
import { getPiecesForGroup } from "@/lib/pieces/queries";
import { SetListSequence } from "@/lib/setlists/sequence";
import { testPrisma } from "../support/db";
import { createGroup, createPiece, createPieceNote } from "../support/fixtures";

describe("the pieces list includes each piece's Piece notes", () => {
  let group: Group;
  let userId: string;
  let kyrie: Piece;
  let gloria: Piece;

  beforeEach(async () => {
    group = await createGroup();
    userId = group.createdById;
    kyrie = await createPiece({ name: "Kyrie", groupId: group.id, createdById: userId });
    gloria = await createPiece({ name: "Gloria", groupId: group.id, createdById: userId });

    await createPieceNote({
      piece: kyrie,
      createdById: userId,
      content: "Äldst",
      updatedAt: new Date("2026-01-01T10:00:00Z"),
    });
    await createPieceNote({
      piece: kyrie,
      createdById: userId,
      content: "Nyast\nmed radbrytning",
      updatedAt: new Date("2026-03-01T10:00:00Z"),
    });
    await createPieceNote({
      piece: kyrie,
      createdById: userId,
      content: "Mitten",
      updatedAt: new Date("2026-02-01T10:00:00Z"),
    });
  });

  it("returns each piece's notes newest-updated first for the Group's pieces", async () => {
    const pieces = await getPiecesForGroup(group.id);

    expect(pieces.map((piece) => [piece.name, piece.notes.map((note) => note.content)])).toEqual([
      ["Gloria", []],
      ["Kyrie", ["Nyast\nmed radbrytning", "Mitten", "Äldst"]],
    ]);
  });

  it("returns each piece step's notes newest-updated first for a Set list", async () => {
    const setList: SetList = await testPrisma.setList.create({
      data: { name: "Konsert", groupId: group.id, createdById: userId, updatedById: userId },
    });
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: kyrie.id }, userId);
    await SetListSequence.append(setList.id, { kind: "note", content: "Paus" }, userId);
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: gloria.id }, userId);

    const steps = await SetListSequence.steps(setList.id);

    expect(
      steps.map((step) =>
        step.kind === "piece" ? step.piece.notes.map((note) => note.content) : step.content
      )
    ).toEqual([["Nyast\nmed radbrytning", "Mitten", "Äldst"], "Paus", []]);
  });
});
