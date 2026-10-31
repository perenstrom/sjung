import type { Person } from "@/types/piece-credit-dialog";

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("sv");
}

export function filterPeople(people: Person[], query: string): Person[] {
  const needle = normalizeName(query);
  if (needle === "") {
    return people;
  }
  return people.filter((person) => normalizeName(person.name).includes(needle));
}

/**
 * Whether the combobox should offer to create a Person from the typed text.
 * Names aren't unique, so this only hides the option on an exact
 * (trimmed, case-insensitive) match.
 */
export function shouldOfferCreatePerson(people: Person[], query: string): boolean {
  const name = normalizeName(query);
  if (name === "") {
    return false;
  }
  return !people.some((person) => normalizeName(person.name) === name);
}

/**
 * Combines the server-provided people with ones created client-side since the
 * last refresh, so they're selectable before revalidation catches up.
 */
export function mergePeople(people: Person[], created: Person[]): Person[] {
  const knownIds = new Set(people.map((person) => person.id));
  const additions = created.filter((person) => !knownIds.has(person.id));
  if (additions.length === 0) {
    return people;
  }
  return [...people, ...additions].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}
