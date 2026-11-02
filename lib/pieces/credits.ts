import { ROLES } from "@/lib/roles";

export type PieceCredit = {
  personId: string;
  role: string;
};

export function creditKey(credit: PieceCredit): string {
  return `${credit.personId}::${credit.role}`;
}

export const DUPLICATE_CREDITS_ERROR = "En person kan inte ha samma roll flera gånger";

export function assertNoDuplicateCredits(credits: PieceCredit[]) {
  const seen = new Set<string>();
  for (const credit of credits) {
    const key = creditKey(credit);
    if (seen.has(key)) {
      throw new Error(DUPLICATE_CREDITS_ERROR);
    }
    seen.add(key);
  }
}

export function diffCredits(current: PieceCredit[], next: PieceCredit[]) {
  const nextKeys = new Set(next.map(creditKey));
  const currentKeys = new Set(current.map(creditKey));

  const creditsToCreate = next.filter(
    (credit) => !currentKeys.has(creditKey(credit))
  );
  const creditsToDelete = current.filter(
    (credit) => !nextKeys.has(creditKey(credit))
  );

  return {
    creditsToCreate,
    creditsToDelete,
  };
}

/** The Credit roles a Person already holds, so they can't be picked again. */
export function creditRolesHeldBy(credits: PieceCredit[], personId: string): Set<string> {
  return new Set(
    credits.filter((credit) => credit.personId === personId).map((credit) => credit.role)
  );
}

type CreditForDisplay = {
  role: string;
  person: { name: string };
};

const compareSv = (a: string, b: string) => a.localeCompare(b, "sv-SE", { sensitivity: "base" });

export function sortCreditsForDisplay<T extends CreditForDisplay>(credits: T[]): T[] {
  const roleBuckets = new Map<string, T[]>();

  for (const credit of credits) {
    const bucket = roleBuckets.get(credit.role);
    if (bucket) bucket.push(credit);
    else roleBuckets.set(credit.role, [credit]);
  }

  const knownRoleSet = new Set<string>(ROLES as unknown as string[]);
  const knownRoles = ROLES.filter((role) => roleBuckets.has(role));
  const unknownRoles = [...roleBuckets.keys()].filter((role) => !knownRoleSet.has(role)).sort(compareSv);

  const orderedRoles = [...knownRoles, ...unknownRoles];

  return orderedRoles.flatMap((role) => {
    const bucket = roleBuckets.get(role) ?? [];
    bucket.sort((a, b) => compareSv(a.person.name, b.person.name));
    return bucket;
  });
}
