import type { SetListSequenceStep } from "@/lib/setlists/types";

export const INVALID_ORDER_ERROR = "Ogiltig ordning";

/**
 * Position arithmetic behind `SetListSequence`. Internal to `lib/setlists`: callers go through
 * `SetListSequence`, which reads and writes the positions these functions compute.
 */
export const SetListPositions = {
  /** Position for a newly appended step, given the current max position in each table. */
  nextPosition(maxPiecePosition: number | null, maxNotePosition: number | null): number {
    return Math.max(maxPiecePosition ?? 0, maxNotePosition ?? 0) + 1;
  },

  /**
   * Renumbers every step (pieces and notes alike) to match `orderedStepIds`.
   * Throws when the ids aren't exactly a permutation of `steps`.
   */
  positionsAfterReorder(
    steps: SetListSequenceStep[],
    orderedStepIds: string[]
  ): SetListSequenceStep[] {
    if (orderedStepIds.length !== steps.length) {
      throw new Error(INVALID_ORDER_ERROR);
    }

    const stepById = new Map(steps.map((step) => [step.id, step]));
    const seen = new Set<string>();
    const updates: SetListSequenceStep[] = [];

    orderedStepIds.forEach((id, index) => {
      if (seen.has(id)) {
        throw new Error(INVALID_ORDER_ERROR);
      }
      seen.add(id);

      const step = stepById.get(id);
      if (!step) {
        throw new Error(INVALID_ORDER_ERROR);
      }

      const position = index + 1;
      if (step.position !== position) {
        updates.push({ kind: step.kind, id: step.id, position });
      }
    });

    return updates;
  },
};
