/**
 * Search on the "Alla noter" list: which Pieces match the text typed in the
 * search box.
 */

/** The parts of a Piece that search looks at. */
type SearchablePiece = {
  name: string;
  credits: { person: { name: string } }[];
};

/**
 * Whether `query` appears anywhere in the Piece's name or in the name of a
 * Person credited on it (any Credit role). Empty or whitespace-only text
 * matches every Piece.
 *
 * Case and accents are ignored ("partiro" finds "partirò", "muller" finds
 * "Müller"), but Å, Ä and Ö stay letters of their own ("a" doesn't find "å").
 */
export function pieceMatchesSearch(piece: SearchablePiece, query: string): boolean {
  const needle = foldForSearch(query.trim());
  if (needle === "") return true;
  return [piece.name, ...piece.credits.map((credit) => credit.person.name)].some((text) =>
    foldForSearch(text).includes(needle)
  );
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
