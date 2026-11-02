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

/** The Person and Credit role picked in an add-credit row; either may still be empty. */
export type CreditDraft = PieceCredit;

export const EMPTY_CREDIT_DRAFT: CreditDraft = { personId: "", role: "" };

export const MISSING_CREDIT_ROLE_ERROR = "Välj en roll eller rensa medverkande.";
export const MISSING_CREDIT_PERSON_ERROR = "Välj en person eller rensa medverkande.";

/**
 * The Credits to save with a new Piece: the staged ones, plus the add row's
 * draft when both a Person and a Credit role are picked. A half-picked draft
 * is an error rather than being silently dropped.
 */
export function resolveCreditsToSubmit(
  staged: PieceCredit[],
  draft: CreditDraft
): { credits: PieceCredit[] } | { error: string } {
  if (draft.personId && draft.role) return { credits: [...staged, draft] };
  if (draft.personId) return { error: MISSING_CREDIT_ROLE_ERROR };
  if (draft.role) return { error: MISSING_CREDIT_PERSON_ERROR };
  return { credits: staged };
}

export type CreditForDisplay = {
  personId: string;
  role: string;
  person: { name: string };
};

export type CreditedPerson = {
  personId: string;
  name: string;
  roles: string[];
};

const compareSv = (a: string, b: string) => a.localeCompare(b, "sv-SE", { sensitivity: "base" });

const KNOWN_ROLES: readonly string[] = ROLES;

/** Known roles in ROLES order first, then any other roles alphabetically. */
function compareRoles(a: string, b: string): number {
  const rankA = KNOWN_ROLES.indexOf(a);
  const rankB = KNOWN_ROLES.indexOf(b);
  if (rankA !== -1 && rankB !== -1) return rankA - rankB;
  if (rankA !== -1) return -1;
  if (rankB !== -1) return 1;
  return compareSv(a, b);
}

/**
 * A piece's credits for display: each Person once, with their Credit roles.
 * People are ordered by their highest-ranked role, then by name.
 */
export function groupCreditsByPerson(credits: CreditForDisplay[]): CreditedPerson[] {
  const people = new Map<string, CreditedPerson>();

  for (const credit of credits) {
    const person = people.get(credit.personId);
    if (person) person.roles.push(credit.role);
    else people.set(credit.personId, { personId: credit.personId, name: credit.person.name, roles: [credit.role] });
  }

  const grouped = [...people.values()];
  for (const person of grouped) person.roles.sort(compareRoles);

  return grouped.sort(
    (a, b) => compareRoles(a.roles[0], b.roles[0]) || compareSv(a.name, b.name)
  );
}
