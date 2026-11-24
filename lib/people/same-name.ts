import { matchKey } from "@/lib/text/match-key";

/**
 * Another Person in the Group already called `name`, ignoring letter case and
 * spacing, for the "Det finns redan …" hint. Two People may share a name, so
 * this only warns. `exceptId` is the Person being renamed, who never matches
 * themself.
 */
export function findSameNamedPerson<P extends { id: string; name: string }>(
  name: string,
  people: readonly P[],
  exceptId?: string,
): P | undefined {
  const key = matchKey(name);
  if (!key) return undefined;
  return people.find((person) => person.id !== exceptId && matchKey(person.name) === key);
}
