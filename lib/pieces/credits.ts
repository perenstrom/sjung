export type PieceCredit = {
  personId: string;
  role: string;
};

const DUPLICATE_CREDITS_ERROR = "En person kan inte ha samma roll flera gånger";

export function assertNoDuplicateCredits(credits: PieceCredit[]) {
  const seen = new Set<string>();
  for (const credit of credits) {
    const key = `${credit.personId}::${credit.role}`;
    if (seen.has(key)) {
      throw new Error(DUPLICATE_CREDITS_ERROR);
    }
    seen.add(key);
  }
}

export function diffCredits(current: PieceCredit[], next: PieceCredit[]) {
  const nextKeys = new Set(next.map((credit) => `${credit.personId}::${credit.role}`));
  const currentKeys = new Set(current.map((credit) => `${credit.personId}::${credit.role}`));

  const creditsToCreate = next.filter(
    (credit) => !currentKeys.has(`${credit.personId}::${credit.role}`)
  );
  const creditsToDelete = current.filter(
    (credit) => !nextKeys.has(`${credit.personId}::${credit.role}`)
  );

  return {
    creditsToCreate,
    creditsToDelete,
  };
}
