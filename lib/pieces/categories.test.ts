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
  const file = (id: string, category: string | null) => ({ id, category });
  const link = (id: string, category: string | null) => ({ id, category });

  it("is null when nothing has a Category", () => {
    expect(groupByCategory([file("f1", null)], [link("l1", null)])).toBeNull();
  });

  it("groups Files and Links in ranking order, Övrigt last, keeping each list's order", () => {
    const groups = groupByCategory(
      [file("f1", null), file("f2", "Texter"), file("f3", "Noter"), file("f4", "Noter")],
      [link("l1", "Inspelningar"), link("l2", "Noter"), link("l3", null)]
    );

    expect(
      groups?.map((group) => ({
        heading: group.heading,
        files: group.files.map((f) => f.id),
        links: group.links.map((l) => l.id),
      }))
    ).toEqual([
      { heading: "Noter", files: ["f3", "f4"], links: ["l2"] },
      { heading: "Inspelningar", files: [], links: ["l1"] },
      { heading: "Texter", files: ["f2"], links: [] },
      { heading: "Övrigt", files: ["f1"], links: ["l3"] },
    ]);
  });
});
