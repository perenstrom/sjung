import { describe, expect, it } from "vitest";

import { groupByCategory, rankCategories, resolveCategory } from "@/lib/pieces/categories";

describe("resolveCategory", () => {
  it.each([
    ["a built-in Category, ignoring case and spacing", "  noter ", [], "Noter"],
    ["a Category already used in the Group", "stämmor", ["Stämmor"], "Stämmor"],
  ])("uses the existing spelling of %s", (_case, typed, groupCategories, expected) => {
    expect(resolveCategory(typed, groupCategories)).toBe(expected);
  });

  it("keeps a new Category as typed, trimmed and with runs of whitespace collapsed", () => {
    expect(resolveCategory("  Kör\t  pdf ", [])).toBe("Kör pdf");
  });

  it.each([
    ["empty text", "   "],
    ["Övrigt in any letter case or spacing", " övrigt  "],
  ])("leaves no Category for %s", (_case, typed) => {
    expect(resolveCategory(typed, ["Övrigt"])).toBeNull();
  });
});

describe("rankCategories", () => {
  it("is exactly the built-in Categories for a Group that uses none", () => {
    expect(rankCategories([])).toEqual(["Noter", "Övningsfiler", "Inspelningar"]);
  });

  it("lists the built-ins first, then the Group's other Categories alphabetically, each once", () => {
    expect(rankCategories(["Texter", "inspelningar", "Ackord", "Texter"])).toEqual([
      "Noter",
      "Övningsfiler",
      "Inspelningar",
      "Ackord",
      "Texter",
    ]);
  });
});

describe("groupByCategory", () => {
  const file = (name: string, category: string | null = null, id = name) => ({ id, displayName: name, category });
  const link = (name: string, category: string | null = null) => ({
    id: name,
    url: "https://example.com",
    label: name,
    category,
  });

  /** Each group as its heading and its entries as "file:name" / "link:name". */
  const shown = (files: ReturnType<typeof file>[], links: ReturnType<typeof link>[]) =>
    groupByCategory(files, links).map((group) => ({
      heading: group.heading,
      entries: group.entries.map((entry) =>
        entry.kind === "file" ? `file:${entry.file.displayName}` : `link:${entry.link.label}`,
      ),
    }));

  it("is empty for a Piece without Files or Links", () => {
    expect(groupByCategory([], [])).toEqual([]);
  });

  it("is one list without a heading, Files and Links sorted together by name, when nothing has a Category", () => {
    expect(shown([file("sopran"), file("Alt")], [link("Bas")])).toEqual([
      { heading: null, entries: ["file:Alt", "link:Bas", "file:sopran"] },
    ]);
  });

  it("groups in ranking order, Övrigt last, each group one list sorted by name", () => {
    expect(
      shown(
        [file("Tenor", "Noter"), file("sopran", null), file("Alt", "Noter"), file("Text", "Texter")],
        [link("Bas", "noter"), link("Inspelning", "Inspelningar"), link("Annat", null)],
      ),
    ).toEqual([
      { heading: "Noter", entries: ["file:Alt", "link:Bas", "file:Tenor"] },
      { heading: "Inspelningar", entries: ["link:Inspelning"] },
      { heading: "Texter", entries: ["file:Text"] },
      { heading: "Övrigt", entries: ["link:Annat", "file:sopran"] },
    ]);
  });

  it("names an unlabelled Link by its hostname", () => {
    const unlabelled = { id: "l", url: "https://www.youtube.com/watch", label: null, category: null };
    const entries = groupByCategory([file("Kör"), file("Alt")], [unlabelled])[0].entries;

    // By its URL it would sort at "h", before "Kör"; by its hostname it sorts at "w".
    expect(entries.map((entry) => entry.kind)).toEqual(["file", "file", "link"]);
  });

  it("puts a File before a Link of the same name, ignoring case", () => {
    expect(shown([file("sopran")], [link("Sopran")])[0].entries).toEqual(["file:sopran", "link:Sopran"]);
    expect(shown([file("Sopran")], [link("sopran")])[0].entries).toEqual(["file:Sopran", "link:sopran"]);
  });

  it("orders Files of the same name the same way whatever order they come in", () => {
    const [a, b] = [file("Alt", null, "a"), file("alt", null, "b")];
    const ids = (files: ReturnType<typeof file>[]) =>
      groupByCategory(files, [])[0].entries.map((e) => e.kind === "file" && e.file.id);

    expect(ids([b, a])).toEqual(ids([a, b]));
  });

  it.each([
    ["numbers by their value", ["Stämma 10", "Stämma 2"], ["Stämma 2", "Stämma 10"]],
    ["Å, Ä and Ö after Z", ["Älg", "Zebra", "Åsna"], ["Zebra", "Åsna", "Älg"]],
    ["accented letters with their plain ones", ["Ester", "Émile", "Dan"], ["Dan", "Émile", "Ester"]],
  ])("sorts %s", (_case, names, expected) => {
    expect(
      shown(
        names.map((name) => file(name)),
        [],
      )[0].entries,
    ).toEqual(expected.map((name) => `file:${name}`));
  });
});
