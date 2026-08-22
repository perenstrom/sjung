import type { SetListSequenceStep } from "@/lib/setlists/types";

const INVALID_ORDER_ERROR = "Ogiltig ordning";

function sortByPosition(steps: SetListSequenceStep[]): SetListSequenceStep[] {
  return [...steps].sort((a, b) => a.position - b.position);
}

/**
 * The single owner of the Set list step position sequence: Set list pieces and Running-order
 * notes share one interleaved `position` column, so any code that renumbers one without the
 * other risks two steps colliding on the same position. Everything that appends, removes, or
 * reorders a step goes through here.
 */
export const SetListSequence = {
  /** Position for a newly appended step, given the current max position in each table. */
  nextPosition(maxPiecePosition: number | null, maxNotePosition: number | null): number {
    return Math.max(maxPiecePosition ?? 0, maxNotePosition ?? 0) + 1;
  },

  /** Renumbers the steps left after one was removed so positions stay contiguous from 1. */
  positionsAfterRemoval(remainingSteps: SetListSequenceStep[]): SetListSequenceStep[] {
    const updates: SetListSequenceStep[] = [];
    sortByPosition(remainingSteps).forEach((step, index) => {
      const position = index + 1;
      if (step.position !== position) {
        updates.push({ kind: step.kind, id: step.id, position });
      }
    });
    return updates;
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
