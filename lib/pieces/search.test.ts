import { describe, expect, it } from "vitest";

import { matchPieceSearch } from "./search";

function piece(name: string, personNames: string[] = [], aliases: string[] = []) {
  return {
    name,
    aliases: aliases.map((name) => ({ name })),
    credits: personNames.map((personName) => ({ person: { name: personName } })),
  };
}

/** "å" as "a" plus a combining ring, as some keyboards and pastes produce it. */
const DECOMPOSED_Å = "å";

const julsangen = piece("O helga natt", ["Adolphe Adam"], ["Julsången", "Cantique de Noël", "Den långa"]);

/** Julsången as the Set list piece picker gives it: without credits, so credited People aren't searched. */
const uncreditedJulsangen = { name: "O helga natt", aliases: [{ name: "Julsången" }] };

describe("matchPieceSearch", () => {
  it.each<{ rule: string; piece: Parameters<typeof matchPieceSearch>[0]; query: string; matches: boolean }>([
    { rule: "text anywhere in the name", piece: piece("Cantique de Jean Racine"), query: "jean", matches: true },
    { rule: "text anywhere in the name", piece: piece("Cantique de Jean Racine"), query: "Racine", matches: true },
    {
      rule: "not when name and credits lack the text",
      piece: piece("Cantique de Jean Racine", ["Gabriel Fauré"]),
      query: "segla",
      matches: false,
    },
    {
      rule: "text anywhere in a credited Person's name",
      piece: piece("Cantique de Jean Racine", ["Gabriel Fauré"]),
      query: "gabriel",
      matches: true,
    },
    {
      rule: "text anywhere in a credited Person's name",
      piece: piece("Vem kan segla", ["Okänd", "Hugo Alfvén"]),
      query: "alfv",
      matches: true,
    },
    { rule: "ignoring case", piece: piece("Cantique de Jean Racine"), query: "CANTIQUE", matches: true },
    { rule: "ignoring case", piece: piece("vem kan segla"), query: "Vem Kan", matches: true },
    { rule: "ignoring foreign accents", piece: piece("Con te partirò"), query: "partiro", matches: true },
    { rule: "ignoring foreign accents", piece: piece("Cantique", ["Gabriel Fauré"]), query: "faure", matches: true },
    { rule: "ignoring foreign accents", piece: piece("Con te partiro"), query: "partirò", matches: true },
    { rule: "ignoring foreign accents", piece: piece("Ave verum", ["Wilhelm Müller"]), query: "muller", matches: true },
    { rule: "ignoring foreign accents", piece: piece("Noël"), query: "noel", matches: true },
    {
      rule: "not treating ü as y, the way Swedish sorting does",
      piece: piece("Ave verum", ["Wilhelm Müller"]),
      query: "myller",
      matches: false,
    },
    { rule: "ø and æ by their Swedish letters", piece: piece("Ave", ["Bjørn Olsen"]), query: "björn", matches: true },
    { rule: "ø and æ by their Swedish letters", piece: piece("Ave", ["Bjørn Olsen"]), query: "BJØRN", matches: true },
    { rule: "ø and æ by their Swedish letters", piece: piece("Ave", ["Ægidius"]), query: "ägid", matches: true },
    { rule: "keeping å, ä and ö apart from a and o", piece: piece("Bår"), query: "a", matches: false },
    { rule: "keeping å, ä and ö apart from a and o", piece: piece("Bör"), query: "o", matches: false },
    { rule: "keeping å, ä and ö apart from a and o", piece: piece("Bår"), query: "bar", matches: false },
    { rule: "keeping å, ä and ö apart from a and o", piece: piece("Bär"), query: "bar", matches: false },
    { rule: "keeping å, ä and ö apart from a and o", piece: piece("Över"), query: "over", matches: false },
    { rule: "keeping å, ä and ö apart from a and o", piece: piece("Bår"), query: "BÅR", matches: true },
    { rule: "decomposed and composed å alike", piece: piece("Bår"), query: `b${DECOMPOSED_Å}r`, matches: true },
    { rule: "decomposed and composed å alike", piece: piece(`B${DECOMPOSED_Å}r`), query: "bår", matches: true },
    { rule: "ignoring surrounding whitespace", piece: piece("Vem kan segla"), query: "  segla ", matches: true },
    { rule: "everything for empty text", piece: piece("Vem kan segla"), query: "", matches: true },
    { rule: "everything for empty text", piece: piece("Vem kan segla"), query: "   ", matches: true },
    { rule: "not text longer than the name", piece: piece("Ave"), query: "Ave verum", matches: false },
    { rule: "an Alias, folding case and accents", piece: julsangen, query: "JULSÅNG", matches: true },
    { rule: "an Alias, folding case and accents", piece: julsangen, query: "noel", matches: true },
    { rule: "an Alias, folding case and accents", piece: julsangen, query: "julsang", matches: false },
    { rule: "not a Piece without credits by a Person", piece: uncreditedJulsangen, query: "adam", matches: false },
  ])("matches $rule: $query in $piece.name is $matches", ({ piece, query, matches }) => {
    expect(matchPieceSearch(piece, query) !== null).toBe(matches);
  });
});

describe("the Aliases matchPieceSearch reports", () => {
  it.each<{ case: string; piece: Parameters<typeof matchPieceSearch>[0]; query: string; aliases: string[] }>([
    { case: "none when only the name matches", piece: julsangen, query: "n", aliases: [] },
    {
      case: "only those that match when the name doesn't, in order",
      piece: julsangen,
      query: "ång",
      aliases: ["Julsången", "Den långa"],
    },
    { case: "an accented Alias", piece: julsangen, query: "noël", aliases: ["Cantique de Noël"] },
    {
      case: "none when the name matches too",
      piece: piece("Julsång", [], ["Julsången"]),
      query: "julsång",
      aliases: [],
    },
    { case: "none when the search is empty", piece: julsangen, query: " ", aliases: [] },
    { case: "none for a Piece found only by a credited Person", piece: julsangen, query: "adam", aliases: [] },
    {
      case: "a match on a Piece with no credits to search",
      piece: uncreditedJulsangen,
      query: "jul",
      aliases: ["Julsången"],
    },
  ])("reports $case", ({ piece, query, aliases }) => {
    expect(matchPieceSearch(piece, query)).toEqual({ matchingAliases: aliases });
  });
});
