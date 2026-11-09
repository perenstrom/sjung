import { beforeEach, describe, expect, it } from "vitest";

import type { Group, Piece, SetList } from "@/app/generated/prisma/client";
import { SetListSequence } from "@/lib/setlists/sequence";
import { testPrisma } from "../support/db";
import { createGroup, createPiece } from "../support/fixtures";

function stepLabels(steps: Awaited<ReturnType<typeof SetListSequence.steps>>): string[] {
  return steps.map((step) => (step.kind === "piece" ? step.piece.name : step.content));
}

describe("SetListSequence", () => {
  let group: Group;
  let userId: string;
  let setList: SetList;
  let kyrie: Piece;
  let gloria: Piece;

  beforeEach(async () => {
    group = await createGroup();
    userId = group.createdById;
    setList = await testPrisma.setList.create({
      data: { name: "Konsert", groupId: group.id, createdById: userId, updatedById: userId },
    });
    kyrie = await createPiece({ name: "Kyrie", groupId: group.id, createdById: userId });
    gloria = await createPiece({ name: "Gloria", groupId: group.id, createdById: userId });
  });

  it("has no steps for a new set list", async () => {
    expect(await SetListSequence.steps(setList.id)).toEqual([]);
  });

  it("puts each appended step last, pieces and notes in one order", async () => {
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: kyrie.id }, userId);
    await SetListSequence.append(setList.id, { kind: "note", content: "Paus" }, userId);
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: gloria.id }, userId);
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: kyrie.id }, userId);

    expect(stepLabels(await SetListSequence.steps(setList.id))).toEqual([
      "Kyrie",
      "Paus",
      "Gloria",
      "Kyrie",
    ]);
  });

  it("records who added the step", async () => {
    const step = await SetListSequence.append(setList.id, { kind: "note", content: "Paus" }, userId);

    const note = await testPrisma.setListNote.findUniqueOrThrow({ where: { id: step.id } });
    expect(note).toMatchObject({ createdById: userId, updatedById: userId });
  });

  it("reorders pieces and notes together", async () => {
    const a = await SetListSequence.append(setList.id, { kind: "piece", pieceId: kyrie.id }, userId);
    const pause = await SetListSequence.append(setList.id, { kind: "note", content: "Paus" }, userId);
    const b = await SetListSequence.append(setList.id, { kind: "piece", pieceId: gloria.id }, userId);

    await SetListSequence.reorder(setList.id, [b.id, pause.id, a.id], userId);

    expect(stepLabels(await SetListSequence.steps(setList.id))).toEqual(["Gloria", "Paus", "Kyrie"]);
  });

  it("refuses an order that doesn't match the current steps, and leaves the order as it was", async () => {
    const a = await SetListSequence.append(setList.id, { kind: "piece", pieceId: kyrie.id }, userId);
    const b = await SetListSequence.append(setList.id, { kind: "piece", pieceId: gloria.id }, userId);
    await SetListSequence.append(setList.id, { kind: "note", content: "Paus" }, userId);

    await expect(SetListSequence.reorder(setList.id, [b.id, a.id], userId)).rejects.toThrow(
      "Ogiltig ordning"
    );
    expect(stepLabels(await SetListSequence.steps(setList.id))).toEqual(["Kyrie", "Gloria", "Paus"]);
  });

  it("keeps the order after a step is removed, and appends after the rest", async () => {
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: kyrie.id }, userId);
    const pause = await SetListSequence.append(setList.id, { kind: "note", content: "Paus" }, userId);
    await SetListSequence.append(setList.id, { kind: "piece", pieceId: gloria.id }, userId);

    await testPrisma.setListNote.delete({ where: { id: pause.id } });
    await SetListSequence.append(setList.id, { kind: "note", content: "Tack" }, userId);

    expect(stepLabels(await SetListSequence.steps(setList.id))).toEqual(["Kyrie", "Gloria", "Tack"]);
  });

  it("orders steps that share a position by when they were added", async () => {
    const shared = { setListId: setList.id, position: 1, createdById: userId, updatedById: userId };
    await testPrisma.setListNote.create({
      data: { ...shared, content: "Först", createdAt: new Date("2026-01-01") },
    });
    await testPrisma.setListPiece.create({
      data: { ...shared, pieceId: kyrie.id, createdAt: new Date("2026-01-02") },
    });

    expect(stepLabels(await SetListSequence.steps(setList.id))).toEqual(["Först", "Kyrie"]);
  });
});
