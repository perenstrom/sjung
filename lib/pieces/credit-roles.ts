import { compareCaseInsensitive } from "@/lib/data-table/sorting";

/**
 * Credit roles are free text. These three are always offered and rank first,
 * in this order; any other role a Group has used follows alphabetically.
 */
export const BUILT_IN_CREDIT_ROLES: readonly string[] = ["Arrangör", "Kompositör", "Textförfattare"];

export const MAX_CREDIT_ROLE_LENGTH = 50;

/** Trimmed, with each run of whitespace collapsed to one space. */
export function normalizeCreditRole(role: string): string {
  return role.trim().replace(/\s+/g, " ");
}

/** Two roles are the same if they differ only in letter case or spacing. */
function creditRoleKey(role: string): string {
  return normalizeCreditRole(role).toLocaleLowerCase("sv");
}

/** Built-in roles in their order first, then every other role alphabetically. */
export function compareCreditRoles(a: string, b: string): number {
  const rankA = BUILT_IN_CREDIT_ROLES.indexOf(a);
  const rankB = BUILT_IN_CREDIT_ROLES.indexOf(b);
  if (rankA !== -1 && rankB !== -1) return rankA - rankB;
  if (rankA !== -1) return -1;
  if (rankB !== -1) return 1;
  return compareCaseInsensitive(a, b);
}

/**
 * The built-in roles merged with the roles used on a Group's credits, each
 * once (the built-in or first-seen spelling wins), in ranked order.
 */
export function rankCreditRoles(groupRoles: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const role of [...BUILT_IN_CREDIT_ROLES, ...groupRoles]) {
    const normalized = normalizeCreditRole(role);
    const key = creditRoleKey(normalized);
    if (normalized !== "" && !byKey.has(key)) byKey.set(key, normalized);
  }
  return [...byKey.values()].sort(compareCreditRoles);
}

/**
 * The role to store for a typed one: the existing spelling when it matches a
 * built-in role or one already on the Group's credits, else the typed text
 * normalized.
 */
export function resolveCreditRole(typed: string, groupRoles: readonly string[]): string {
  const key = creditRoleKey(typed);
  return (
    rankCreditRoles(groupRoles).find((role) => creditRoleKey(role) === key) ??
    normalizeCreditRole(typed)
  );
}

/**
 * The roles to suggest for the typed text: those containing it anywhere
 * (ignoring case and spacing), minus the ones the chosen Person already holds.
 */
export function creditRoleSuggestions(
  roles: readonly string[],
  heldRoles: ReadonlySet<string>,
  query: string
): string[] {
  const needle = creditRoleKey(query);
  return roles.filter((role) => !heldRoles.has(role) && creditRoleKey(role).includes(needle));
}

/** Whether to offer the typed text as a new role: it's not empty and is no known role. */
export function shouldOfferNewCreditRole(roles: readonly string[], query: string): boolean {
  const key = creditRoleKey(query);
  return key !== "" && !roles.some((role) => creditRoleKey(role) === key);
}
