export type PieceCredit = {
  personId: string;
  role: string;
};

const INVALID_CREDITS_ERROR = "Ogiltigt format för medverkande";
const DUPLICATE_CREDITS_ERROR = "En person kan inte ha samma roll flera gånger";

export function parseCreditsFromFormData(formData: FormData): PieceCredit[] {
  const creditsJson = formData.get("credits");
  if (!creditsJson) {
    return [];
  }
  if (typeof creditsJson !== "string") {
    throw new Error(INVALID_CREDITS_ERROR);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(creditsJson);
  } catch {
    throw new Error(INVALID_CREDITS_ERROR);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(INVALID_CREDITS_ERROR);
  }

  return parsed.map((item) => {
    const candidate = item as Record<string, unknown>;
    if (
      !item ||
      typeof item !== "object" ||
      typeof candidate.personId !== "string" ||
      candidate.personId.trim() === "" ||
      typeof candidate.role !== "string" ||
      candidate.role.trim() === ""
    ) {
      throw new Error(INVALID_CREDITS_ERROR);
    }

    return {
      personId: candidate.personId.trim(),
      role: candidate.role.trim(),
    };
  });
}

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
