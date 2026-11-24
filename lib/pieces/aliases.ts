import { matchKey } from "@/lib/text/match-key";

/**
 * Whether `name` would add a new Alias to the Piece: it repeats neither the
 * Piece's name nor one of its Aliases, ignoring letter case and spacing
 * (CONTEXT.md: Alias).
 */
export function isNewAlias(name: string, piece: { name: string; aliases: readonly { name: string }[] }): boolean {
  const key = matchKey(name);
  return [piece.name, ...piece.aliases.map((alias) => alias.name)].every((taken) => matchKey(taken) !== key);
}
