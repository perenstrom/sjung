import { describe, expect, it } from "vitest";

import {
  buildImportPlan,
  EMPTY_IMPORT_GROUP as EMPTY_GROUP,
  importOutcome,
  MAX_IMPORT_ROWS,
  NO_IMPORT_CHOICES,
  type ImportChoices,
  type ImportGroup,
  type ImportPreview,
} from "@/lib/pieces/import";

function preview(text: string, group: ImportGroup = EMPTY_GROUP, choices: ImportChoices = NO_IMPORT_CHOICES) {
  const plan = buildImportPlan(text, group, choices);
  if (plan.kind !== "preview") throw new Error(`Expected a preview, got ${plan.kind}`);
  return plan;
}

/** Each added Piece as `title: Name (role, role) · Name (role)`. */
function added(plan: ImportPreview): string[] {
  return plan.rows
    .filter((row) => row.add)
    .map((row) => {
      const credits = row.credits.map((c) => `${c.person.name} (${c.roles.join(", ")})`).join(" · ");
      return credits ? `${row.title}: ${credits}` : row.title;
    });
}

const tsv = (...rows: string[][]) => rows.map((row) => row.join("\t")).join("\n");

describe("reading the pasted rows", () => {
  it("reads tab-, semicolon- and comma-separated text the same, with quoted cells", () => {
    const tab = tsv(["Titel", "Kompositör"], ["Uti vår hage", "Hugo Alfvén"], ["Ave verum", "W. A. Mozart"]);
    const semicolon = 'Titel;Kompositör\n"Uti vår hage";Hugo Alfvén\nAve verum;"W. A. Mozart"';
    const comma = 'Titel,Kompositör\r\n"Uti vår hage","Hugo Alfvén"\r\n"Ave verum",W. A. Mozart\r\n';

    const expected = ["Uti vår hage: Hugo Alfvén (Kompositör)", "Ave verum: W. A. Mozart (Kompositör)"];
    expect(added(preview(tab))).toEqual(expected);
    expect(added(preview(semicolon))).toEqual(expected);
    expect(added(preview(comma))).toEqual(expected);
  });

  it("reads delimiters, escaped quotes and line breaks inside quoted cells as text", () => {
    const text = 'Titel,Kompositör\n"Hej, ""du""\nglade",Okänd';

    expect(preview(text).rows.map((row) => row.title)).toEqual(['Hej, "du" glade']);
  });

  it("takes the title from the first column whatever its header says", () => {
    expect(preview(tsv(["Namn", "Kompositör"], ["Kyrie", ""])).rows.map((row) => row.title)).toEqual(["Kyrie"]);
    expect(added(preview(`\n${tsv(["", "Kompositör"], ["Kyrie", "Mozart"])}`))).toEqual(["Kyrie: Mozart (Kompositör)"]);
  });

  it("ignores blank rows without a message", () => {
    const plan = preview(`\n${tsv(["Titel"], ["Kyrie"])}\n\n\t\nGloria\n\n`);

    expect(plan.rows.map((row) => row.title)).toEqual(["Kyrie", "Gloria"]);
    expect(plan.skipped).toEqual([]);
  });

  it("is empty until something other than whitespace is pasted", () => {
    expect(buildImportPlan(" \n\t\n", EMPTY_GROUP, NO_IMPORT_CHOICES).kind).toBe("empty");
  });

  it(`refuses more than ${MAX_IMPORT_ROWS} rows rather than cutting them short`, () => {
    const rows = (count: number) => ["Titel", ...Array.from({ length: count }, (_, i) => `Stycke ${i}`)].join("\n");

    expect(buildImportPlan(rows(MAX_IMPORT_ROWS), EMPTY_GROUP, NO_IMPORT_CHOICES).kind).toBe("preview");
    expect(buildImportPlan(rows(MAX_IMPORT_ROWS + 1), EMPTY_GROUP, NO_IMPORT_CHOICES)).toEqual({
      kind: "tooMany",
      rowCount: MAX_IMPORT_ROWS + 1,
    });
  });

  it("skips each row it can't read, with its line and reason, and keeps reading after it", () => {
    const text = [
      "Titel\tKompositör",
      "\tOkänd",
      "Kyrie\tA\tB",
      `${"x".repeat(201)}\t`,
      `Gloria\t${"y".repeat(201)}`,
      '"Sanctus\tOkänd',
      "Agnus Dei\t",
    ].join("\n");

    const plan = preview(text);

    expect(plan.skipped.map(({ line, reason }) => [line, reason])).toEqual([
      [2, "Titel saknas"],
      [3, "Fler celler än rubriker"],
      [4, "Titeln är längre än 200 tecken"],
      [5, "Ett namn är längre än 200 tecken"],
      [6, "Ett citattecken stängs aldrig"],
    ]);
    expect(plan.skipped[0].raw).toBe("\tOkänd");
    expect(plan.rows.map((row) => row.title)).toEqual(["Agnus Dei"]);
  });

  it("reads a paste with only a title column whole, commas and all", () => {
    expect(added(preview("Titel\nHey, Jude\nKyrie; Gloria"))).toEqual(["Hey, Jude", "Kyrie; Gloria"]);
  });

  it("skips a row whose stray quote would otherwise swallow the rows up to the next quote", () => {
    const plan = preview(
      ["Titel\tKompositör", '"Sanctus\tOkänd', "Benedictus\tOkänd", '"Agnus Dei"\tOkänd'].join("\n"),
    );

    expect(plan.skipped.map(({ line, reason }) => [line, reason])).toEqual([[2, "Ett citattecken stängs aldrig"]]);
    expect(plan.rows.map((row) => row.title)).toEqual(["Benedictus", "Agnus Dei"]);
  });

  it("allows empty cells past the last header, as spreadsheets paste them", () => {
    expect(preview("Titel\tKompositör\nKyrie\tOkänd\t\t").skipped).toEqual([]);
  });
});

describe("columns", () => {
  const group: ImportGroup = { people: [], creditRoles: ["Dirigent"], pieceTitles: [] };

  it("uses columns named after a built-in or in-use Credit role, and ignores the rest", () => {
    const plan = preview(tsv(["Titel", "kompositör", "DIRIGENT", "År", "Kompositör & textförfattare"]), group);

    expect(plan.columns.map((c) => [c.header, c.role, c.use])).toEqual([
      ["kompositör", "Kompositör", true],
      ["DIRIGENT", "Dirigent", true],
      ["År", "År", false],
      ["Kompositör & textförfattare", "Kompositör & textförfattare", false],
    ]);
  });

  it("marks a Credit role new to the Group, built-in ones included, until a Credit uses it", () => {
    const plan = preview(tsv(["Titel", "Kompositör", "Dirigent"]), group);

    expect(plan.columns.map((c) => [c.role, c.isNewToGroup])).toEqual([
      ["Kompositör", true],
      ["Dirigent", false],
    ]);
  });

  it("follows the user's choice per column, and an ignored column creates no Credits", () => {
    const text = tsv(["Titel", "Kompositör", "Solist"], ["Kyrie", "Mozart", "Anna"]);

    expect(added(preview(text, group, { ...NO_IMPORT_CHOICES, columns: { 1: false, 2: true } }))).toEqual([
      "Kyrie: Anna (Solist)",
    ]);
  });

  it("never uses a column whose header is empty or too long for a Credit role", () => {
    const plan = preview(tsv(["Titel", "", "x".repeat(51)], ["Kyrie", "A", "B"]), group, {
      ...NO_IMPORT_CHOICES,
      columns: { 1: true, 2: true },
    });

    expect(plan.columns.map((c) => [c.use, c.unusableReason])).toEqual([
      [false, "Rubrik saknas"],
      [false, "Rollen får vara högst 50 tecken"],
    ]);
    expect(added(plan)).toEqual(["Kyrie"]);
  });
});

describe("matching People and Credits", () => {
  const group: ImportGroup = {
    people: [
      { id: "benny", name: "Benny Andersson" },
      { id: "anders", name: "Anders Åström" },
    ],
    creditRoles: [],
    pieceTitles: [],
  };

  it("reuses a Person who differs only in letter case or spacing, but not in accents", () => {
    const plan = preview(tsv(["Titel", "Kompositör"], ["Kyrie", " benny   andersson ; Anders Aström"]), group);

    expect(plan.rows[0].credits.map((c) => c.person)).toEqual([
      { kind: "existing", id: "benny", name: "Benny Andersson" },
      { kind: "new", name: "Anders Aström" },
    ]);
  });

  it("gives a Person named in several cells of a row one Credit per role, and counts a repeated name once", () => {
    const text = tsv(
      ["Titel", "Kompositör", "Textförfattare"],
      ["Kom i min famn", "Benny Andersson; benny andersson", "BENNY ANDERSSON"],
    );

    expect(added(preview(text, group))).toEqual(["Kom i min famn: Benny Andersson (Kompositör, Textförfattare)"]);
  });

  it("merges two columns naming the same Credit role", () => {
    const text = tsv(["Titel", "Kompositör", "kompositör"], ["Kyrie", "Mozart", "mozart"]);

    expect(added(preview(text))).toEqual(["Kyrie: Mozart (Kompositör)"]);
  });

  it("creates each new Person once, with the first spelling seen", () => {
    const plan = preview(tsv(["Titel", "Kompositör"], ["Kyrie", "hugo alfvén"], ["Gloria", "Hugo Alfvén"]));

    expect(added(plan)).toEqual(["Kyrie: hugo alfvén (Kompositör)", "Gloria: hugo alfvén (Kompositör)"]);
    expect(plan.newPeople).toEqual(["hugo alfvén"]);
  });

  it("adds a Piece with no Credits when its row has only a title", () => {
    expect(added(preview(tsv(["Titel", "Kompositör"], ["Kyrie", ""], ["Gloria"])))).toEqual(["Kyrie", "Gloria"]);
  });

  it("shows each used cell's People, and an ignored cell's text as it was", () => {
    const plan = preview(tsv(["Titel", "Kompositör", "År"], ["Kyrie", "Benny Andersson; Ny Person", " 1791 "]), group);

    expect(plan.rows[0].cells).toEqual([
      {
        kind: "people",
        people: [
          { kind: "existing", id: "benny", name: "Benny Andersson" },
          { kind: "new", name: "Ny Person" },
        ],
      },
      { kind: "ignored", text: "1791" },
    ]);
  });
});

describe("duplicate titles", () => {
  const group: ImportGroup = { people: [], creditRoles: [], pieceTitles: ["Uti vår hage"] };
  const text = tsv(["Titel"], ["uti  vår hage"], ["Kyrie"], ["KYRIE"]);

  it("skips a Piece whose title the Group or an earlier row already has", () => {
    const plan = preview(text, group);

    expect(plan.rows.map((row) => [row.line, row.duplicate, row.add])).toEqual([
      [2, "existing", false],
      [3, null, true],
      [4, "earlier", false],
    ]);
  });

  it("adds a duplicate the user chose to add anyway", () => {
    const plan = preview(text, group, { ...NO_IMPORT_CHOICES, addDuplicateLines: [2, 4] });

    expect(added(plan)).toEqual(["uti vår hage", "Kyrie", "KYRIE"]);
  });

  it("leaves the People of a skipped Piece out of the People to create", () => {
    const plan = preview(tsv(["Titel", "Kompositör"], ["Uti vår hage", "Hugo Alfvén"]), group);

    expect(plan.newPeople).toEqual([]);
  });
});

describe("the summary counts", () => {
  it("counts Pieces to add, rows skipped, new People and Credit roles new to the Group", () => {
    const group: ImportGroup = { people: [], creditRoles: ["Dirigent"], pieceTitles: ["Gloria"] };
    const text = tsv(
      ["Titel", "Kompositör", "Dirigent", "Arrangör"],
      ["Kyrie", "Mozart", "Eric Ericson", ""],
      ["Gloria", "Vivaldi", "", "Okänd"],
      ["", "Okänd", "", ""],
    );

    expect(preview(text, group).counts).toEqual({
      pieces: 1,
      skipped: 2,
      newPeople: 2,
      newCreditRoles: ["Kompositör"],
    });
  });
});

describe("the import outcome", () => {
  const text = tsv(["Titel", "Kompositör"], ["Kyrie", "Mozart"]);

  it("stays the same while the Group doesn't change", () => {
    expect(importOutcome(preview(text))).toBe(importOutcome(preview(text)));
  });

  it("changes when a Person or a Piece title has been added to the Group since", () => {
    const before = importOutcome(preview(text));

    expect(importOutcome(preview(text, { ...EMPTY_GROUP, people: [{ id: "m", name: "Mozart" }] }))).not.toBe(before);
    expect(importOutcome(preview(text, { ...EMPTY_GROUP, pieceTitles: ["Kyrie"] }))).not.toBe(before);
  });
});
