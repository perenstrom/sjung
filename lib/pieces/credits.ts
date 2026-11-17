import { compareCaseInsensitive } from "@/lib/data-table/sorting";
import { compareCreditRoles } from "@/lib/pieces/credit-roles";

export type PieceCredit = {
  personId: string;
  role: string;
};

export function creditKey(credit: PieceCredit): string {
  return `${credit.personId}::${credit.role}`;
}

export const DUPLICATE_CREDITS_ERROR = "En upphovsperson kan inte ha samma roll flera gånger";

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

/** The Person and Credit roles picked in an add-credit row; either may still be empty. */
export type CreditDraft = {
  personId: string;
  roles: string[];
};

export const EMPTY_CREDIT_DRAFT: CreditDraft = { personId: "", roles: [] };

export const MISSING_CREDIT_ROLE_ERROR = "Välj minst en roll eller rensa medverkande.";
export const MISSING_CREDIT_PERSON_ERROR = "Välj en upphovsperson eller rensa medverkande.";
export const MISSING_CREDIT_FIELDS_ERROR = "Välj upphovsperson och minst en roll.";

/** What is missing before a draft can be added, or null when it is complete. */
export function creditDraftError(draft: CreditDraft): string | null {
  const hasRoles = draft.roles.length > 0;
  if (draft.personId && hasRoles) return null;
  if (draft.personId) return MISSING_CREDIT_ROLE_ERROR;
  if (hasRoles) return MISSING_CREDIT_PERSON_ERROR;
  return MISSING_CREDIT_FIELDS_ERROR;
}

/** One Credit per picked role. */
export function creditsFromDraft(draft: CreditDraft): PieceCredit[] {
  return draft.roles.map((role) => ({ personId: draft.personId, role }));
}

/** The draft with another Person picked, dropping picked roles that Person already holds. */
export function withCreditDraftPerson(
  draft: CreditDraft,
  credits: PieceCredit[],
  personId: string
): CreditDraft {
  const held = creditRolesHeldBy(credits, personId);
  return { personId, roles: draft.roles.filter((role) => !held.has(role)) };
}

/** Picks a role that isn't picked, and unpicks one that is. */
export function toggleCreditRole(roles: string[], role: string): string[] {
  return roles.includes(role) ? roles.filter((picked) => picked !== role) : [...roles, role];
}

/**
 * The Credits to save with a new Piece: the staged ones, plus one per role
 * of the add row's draft when both a Person and roles are picked. A
 * half-picked draft is an error rather than being silently dropped.
 */
export function resolveCreditsToSubmit(
  staged: PieceCredit[],
  draft: CreditDraft
): { credits: PieceCredit[] } | { error: string } {
  if (!draft.personId && draft.roles.length === 0) return { credits: staged };
  const error = creditDraftError(draft);
  if (error) return { error };
  return { credits: [...staged, ...creditsFromDraft(draft)] };
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
  for (const person of grouped) person.roles.sort(compareCreditRoles);

  return grouped.sort(
    (a, b) => compareCreditRoles(a.roles[0], b.roles[0]) || compareCaseInsensitive(a.name, b.name)
  );
}

/**
 * A piece's credits on one line, as `Name (role, role) · Name (role)`, in
 * the same order as `groupCreditsByPerson`. Empty when there are none.
 */
export function formatCreditsLine(credits: CreditForDisplay[]): string {
  return groupCreditsByPerson(credits)
    .map((person) => `${person.name} (${person.roles.join(", ")})`)
    .join(" · ");
}
