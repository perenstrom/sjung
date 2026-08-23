import { ROLES } from "@/lib/roles";

export type PieceCredit = {
  personId: string;
  role: string;
};

export const DUPLICATE_CREDITS_ERROR = "En person kan inte ha samma roll flera gånger";

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
