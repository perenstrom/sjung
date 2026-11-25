import { describe, expect, it } from "vitest";

import { groupByCategory } from "@/lib/pieces/categories";

import { applyHidden, hiddenNotice, hiddenPlace } from "./hidden";

const file = (id: string, category: string | null = null) => ({ id, displayName: id, category });
const link = (id: string, category: string | null = null) => ({
  id,
  url: `https://example.org/${id}`,
  label: id,
  category,
});

const hides = { hiddenFileIds: ["f-hidden"], hiddenLinkIds: ["l-hidden"] };

describe("applyHidden", () => {
  it("leaves Hidden Files and Links out, and counts them", () => {
    const shown = applyHidden([file("f-hidden"), file("f")], [link("l-hidden"), link("l")], hides, {
      showHidden: false,
    });

    expect(shown.files.map(({ id }) => id)).toEqual(["f"]);
    expect(shown.links.map(({ id }) => id)).toEqual(["l"]);
    expect(shown.hiddenCount).toBe(2);
  });

  it("shows them marked as Hidden when asked to", () => {
    const shown = applyHidden([file("f-hidden"), file("f")], [link("l")], hides, { showHidden: true });

    expect(shown.files).toEqual([
      { ...file("f-hidden"), hidden: true },
      { ...file("f"), hidden: false },
    ]);
    expect(shown.links).toEqual([{ ...link("l"), hidden: false }]);
    expect(shown.hiddenCount).toBe(1);
  });

  it("shows everything, with nothing Hidden, outside a Set list piece", () => {
    const shown = applyHidden([file("f-hidden")], [link("l-hidden")], undefined, { showHidden: false });

    expect(shown.files.map(({ id }) => id)).toEqual(["f-hidden"]);
    expect(shown.links.map(({ id }) => id)).toEqual(["l-hidden"]);
    expect(shown.hiddenCount).toBe(0);
  });

  it("lets Categories be grouped as if the Hidden ones did not exist", () => {
    const shown = applyHidden([file("f-hidden", "Noter"), file("f")], [link("l-hidden", "Inspelningar")], hides, {
      showHidden: false,
    });

    expect(groupByCategory(shown.files, shown.links)).toEqual([
      { heading: null, entries: [{ kind: "file", file: { ...file("f"), hidden: false } }] },
    ]);
  });
});

describe("hiddenPlace", () => {
  it("names the Set list when known, else just says the Set list", () => {
    expect(hiddenPlace("Julkonsert 2026")).toBe('i "Julkonsert 2026"');
    expect(hiddenPlace(undefined)).toBe("i repertoaren");
  });
});

describe("hiddenNotice", () => {
  it.each([
    [1, 'En fil eller länk är dold i "Julkonsert 2026".'],
    [3, '3 filer och länkar är dolda i "Julkonsert 2026".'],
  ])("counts %i Hidden Files and Links together", (count, text) => {
    expect(hiddenNotice(count, "Julkonsert 2026")).toBe(text);
  });
});
