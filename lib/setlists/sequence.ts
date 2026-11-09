import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { pieceWithRelationsInclude } from "@/lib/pieces/types";
import { SetListPositions } from "@/lib/setlists/sequence-positions";
import type { SetListSequenceStep, SetListStep } from "@/lib/setlists/types";

export type NewSetListStep = { kind: "piece"; pieceId: string } | { kind: "note"; content: string };

type OrderedStep = { position: number; createdAt: Date };

function byPositionThenCreation(a: OrderedStep, b: OrderedStep): number {
  return a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();
}

async function readSequenceSteps(
  tx: Prisma.TransactionClient,
  setListId: string
): Promise<SetListSequenceStep[]> {
  const [pieces, notes] = await Promise.all([
    tx.setListPiece.findMany({ where: { setListId }, select: { id: true, position: true } }),
    tx.setListNote.findMany({ where: { setListId }, select: { id: true, position: true } }),
  ]);

  return [
    ...pieces.map((entry) => ({ kind: "piece" as const, id: entry.id, position: entry.position })),
    ...notes.map((entry) => ({ kind: "note" as const, id: entry.id, position: entry.position })),
  ];
}

/**
 * The single owner of a Set list's running order. Set list pieces and Running-order notes live in
 * two tables but share one order, so everything that reads that order, appends a Set list step or
 * reorders the steps goes through here. Only relative order matters: removing a step is a plain
 * delete by the caller and leaves a harmless gap.
 *
 * Callers must already have checked that the set list belongs to the acting user's Group.
 */
export const SetListSequence = {
  /** The set list's steps in running order. Steps sharing a position fall back to creation order. */
  async steps(setListId: string): Promise<SetListStep[]> {
    const [pieces, notes] = await Promise.all([
      prisma.setListPiece.findMany({
        where: { setListId },
        select: {
          id: true,
          pieceId: true,
          position: true,
          createdAt: true,
          piece: { include: pieceWithRelationsInclude },
        },
      }),
      prisma.setListNote.findMany({
        where: { setListId },
        select: { id: true, content: true, position: true, createdAt: true },
      }),
    ]);

    const ordered: (OrderedStep & { step: SetListStep })[] = [
      ...pieces.map(({ createdAt, ...step }) => ({
        position: step.position,
        createdAt,
        step: { ...step, kind: "piece" as const },
      })),
      ...notes.map(({ createdAt, ...step }) => ({
        position: step.position,
        createdAt,
        step: { ...step, kind: "note" as const },
      })),
    ];

    return ordered.sort(byPositionThenCreation).map(({ step }) => step);
  },

  /** Adds a step after every existing step. */
  async append(setListId: string, step: NewSetListStep, userId: string): Promise<SetListSequenceStep> {
    return prisma.$transaction(async (tx) => {
      const [maxPiece, maxNote] = await Promise.all([
        tx.setListPiece.aggregate({ where: { setListId }, _max: { position: true } }),
        tx.setListNote.aggregate({ where: { setListId }, _max: { position: true } }),
      ]);
      const position = SetListPositions.nextPosition(maxPiece._max.position, maxNote._max.position);
      const audit = { setListId, position, createdById: userId, updatedById: userId };

      if (step.kind === "piece") {
        const created = await tx.setListPiece.create({
          data: { ...audit, pieceId: step.pieceId },
          select: { id: true },
        });
        return { kind: "piece" as const, id: created.id, position };
      }

      const created = await tx.setListNote.create({
        data: { ...audit, content: step.content },
        select: { id: true },
      });
      return { kind: "note" as const, id: created.id, position };
    });
  },

  /**
   * Puts the steps in the order of `orderedStepIds`.
   * Throws "Ogiltig ordning" when the ids aren't exactly the set list's current steps.
   */
  async reorder(setListId: string, orderedStepIds: string[], userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const steps = await readSequenceSteps(tx, setListId);
      const updates = SetListPositions.positionsAfterReorder(steps, orderedStepIds);

      for (const update of updates) {
        const data = { position: update.position, updatedById: userId };
        if (update.kind === "piece") {
          await tx.setListPiece.update({ where: { id: update.id }, data });
        } else {
          await tx.setListNote.update({ where: { id: update.id }, data });
        }
      }
    });
  },
};
