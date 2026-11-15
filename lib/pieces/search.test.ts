import { describe, expect, it } from "vitest";

import { pieceMatchesSearch } from "./search";

function piece(name: string, personNames: string[] = []) {
  return {
    name,
    credits: personNames.map((personName) => ({ person: { name: personName } })),
  };
}

describe("pieceMatchesSearch", () => {
  it("matches text anywhere in the piece name", () => {
    expect(pieceMatchesSearch(piece("Cantique de Jean Racine"), "jean")).toBe(true);
    expect(pieceMatchesSearch(piece("Cantique de Jean Racine"), "Racine")).toBe(true);
  });

  it("doesn't match a piece whose name and credits lack the text", () => {
    expect(pieceMatchesSearch(piece("Cantique de Jean Racine", ["Gabriel Fauré"]), "segla")).toBe(false);
  });

  it("matches text anywhere in a credited Person's name", () => {
    expect(pieceMatchesSearch(piece("Cantique de Jean Racine", ["Gabriel Fauré"]), "gabriel")).toBe(true);
    expect(pieceMatchesSearch(piece("Vem kan segla", ["Okänd", "Hugo Alfvén"]), "alfv")).toBe(true);
  });

  it("ignores case", () => {
    expect(pieceMatchesSearch(piece("Cantique de Jean Racine"), "CANTIQUE")).toBe(true);
    expect(pieceMatchesSearch(piece("vem kan segla"), "Vem Kan")).toBe(true);
  });

  it("ignores accents on letters outside the Swedish alphabet", () => {
    expect(pieceMatchesSearch(piece("Con te partirò"), "partiro")).toBe(true);
    expect(pieceMatchesSearch(piece("Cantique", ["Gabriel Fauré"]), "faure")).toBe(true);
    expect(pieceMatchesSearch(piece("Con te partiro"), "partirò")).toBe(true);
    expect(pieceMatchesSearch(piece("Ave verum", ["Wilhelm Müller"]), "muller")).toBe(true);
    expect(pieceMatchesSearch(piece("Noël"), "noel")).toBe(true);
  });

  it("doesn't treat ü as y, the way Swedish sorting does", () => {
    expect(pieceMatchesSearch(piece("Ave verum", ["Wilhelm Müller"]), "myller")).toBe(false);
  });

  it("finds ø and æ by their Swedish letters ö and ä", () => {
    expect(pieceMatchesSearch(piece("Ave", ["Bjørn Olsen"]), "björn")).toBe(true);
    expect(pieceMatchesSearch(piece("Ave", ["Bjørn Olsen"]), "BJØRN")).toBe(true);
    expect(pieceMatchesSearch(piece("Ave", ["Ægidius"]), "ägid")).toBe(true);
  });

  it("keeps å, ä and ö apart from a and o", () => {
    expect(pieceMatchesSearch(piece("Bår"), "a")).toBe(false);
    expect(pieceMatchesSearch(piece("Bör"), "o")).toBe(false);
    expect(pieceMatchesSearch(piece("Bår"), "bar")).toBe(false);
    expect(pieceMatchesSearch(piece("Bär"), "bar")).toBe(false);
    expect(pieceMatchesSearch(piece("Över"), "over")).toBe(false);
    expect(pieceMatchesSearch(piece("Bår"), "BÅR")).toBe(true);
  });

  it("matches decomposed and composed å alike", () => {
    expect(pieceMatchesSearch(piece("Bår"), "bår")).toBe(true);
    expect(pieceMatchesSearch(piece("Bår"), "bår")).toBe(true);
  });

  it("ignores leading and trailing whitespace in the search text", () => {
    expect(pieceMatchesSearch(piece("Vem kan segla"), "  segla ")).toBe(true);
  });

  it("matches every piece for empty or whitespace-only text", () => {
    expect(pieceMatchesSearch(piece("Vem kan segla"), "")).toBe(true);
    expect(pieceMatchesSearch(piece("Vem kan segla"), "   ")).toBe(true);
  });

  it("doesn't match text longer than the name", () => {
    expect(pieceMatchesSearch(piece("Ave"), "Ave verum")).toBe(false);
  });
});
