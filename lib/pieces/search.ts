/**
 * Search for Pieces: which Pieces match the text typed in a search box, on
 * Alla noter and in the Set list piece picker.
 */

/** The parts of a Piece that search looks at. Without `credits`, credited People aren't searched. */
type SearchablePiece = {
  name: string;
  aliases: readonly { name: string }[];
  credits?: readonly { person: { name: string } }[];
};

/** How a Piece matched: `matchingAliases` lists the Aliases that explain a match its name doesn't. */
export type PieceSearchMatch = { matchingAliases: string[] };

/**
 * Whether `query` appears anywhere in the Piece's name, in one of its
 * Aliases or in the name of a Person credited on it (any Credit role): `null`
 * when it doesn't. Empty or whitespace-only text matches every Piece.
 *
 * When the name itself doesn't match, the match lists the Aliases that do, in
 * their order, so a result can show why it is there. Otherwise it lists none.
 *
 * Case and accents are ignored ("partiro" finds "partirò", "muller" finds
 * "Müller"), but Å, Ä and Ö stay letters of their own ("a" doesn't find "å").
 */
export function matchPieceSearch(piece: SearchablePiece, query: string): PieceSearchMatch | null {
  const needle = foldForSearch(query.trim());
  const contains = (text: string) => foldForSearch(text).includes(needle);
  if (needle === "" || contains(piece.name)) return { matchingAliases: [] };

  const matchingAliases = piece.aliases.map((alias) => alias.name).filter(contains);
  if (matchingAliases.length > 0) return { matchingAliases };
  return (piece.credits ?? []).some((credit) => contains(credit.person.name))
    ? { matchingAliases: [] }
    : null;
}

/**
 * The Pieces that match `query`, in the given order, each with the Aliases
 * that explain its match (see {@link matchPieceSearch}).
 */
export function searchPieces<P extends SearchablePiece>(
  pieces: readonly P[],
  query: string
): { piece: P; matchingAliases: string[] }[] {
  return pieces.flatMap((piece) => {
    const match = matchPieceSearch(piece, query);
    return match ? [{ piece, matchingAliases: match.matchingAliases }] : [];
  });
}

// An accent to drop: any combining mark except the ring of å and the
// diaeresis of ä and ö, which make letters of their own in Swedish.
const DROPPED_ACCENT = /(?<![aA])̊|(?<![aAoO])̈|(?![̊̈])\p{M}/gu;

/**
 * `text` lowercased with accents dropped, keeping å, ä and ö. Not the
 * collation the list sorts by: that files ü under y, which no one searching
 * "muller" for "Müller" would expect. Ø and æ count as their Swedish letters
 * ö and ä.
 */
function foldForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(DROPPED_ACCENT, "")
    .normalize("NFC")
    .toLocaleLowerCase("sv")
    .replace(/ø/g, "ö")
    .replace(/æ/g, "ä");
}
