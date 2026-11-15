import { describe, expect, it } from "vitest";

import { compareCaseInsensitive } from "@/lib/data-table/sorting";
import { letterDividerBefore, letterGroupKey } from "./letterGroups";

describe("letterGroupKey", () => {
  it.each([
    ["Abendlied", "A"],
    ["Bred dina vida vingar", "B"],
    ["Zum Sanctus", "Z"],
  ])("puts %s under its first letter", (name, key) => {
    expect(letterGroupKey(name)).toBe(key);
  });

  it("groups a lowercase first letter with its capital", () => {
    expect(letterGroupKey("ave verum")).toBe("A");
  });

  it.each([
    ["Åkallan", "Å"],
    ["Änglamark", "Ä"],
    ["Över berg och dal", "Ö"],
    ["över berg och dal", "Ö"],
  ])("keeps the Swedish letters apart: %s goes under %s", (name, key) => {
    expect(letterGroupKey(name)).toBe(key);
  });

  it.each([
    ["Écoute", "E"],
    ["Über allen Gipfeln", "Y"],
    ["Ærø", "Ä"],
    ["Østerlars", "Ö"],
  ])("puts %s with the letter it sorts as in Swedish (%s)", (name, key) => {
    expect(letterGroupKey(name)).toBe(key);
  });

  it.each([
    ["1700-tal"],
    ['"Hallelujah"'],
    ["(Kanon)"],
    [""],
    ["   "],
  ])("puts %j under #", (name) => {
    expect(letterGroupKey(name)).toBe("#");
  });

  it("ignores leading whitespace", () => {
    expect(letterGroupKey("  Ave verum")).toBe("A");
  });

  it.each([
    ["Ægir"],
    ["ßtraße"],
    ["Þingvellir"],
    ["Ωmega"],
    ["Ŋoro"],
  ])("puts %s, whose first letter is outside A–Ö, in the group it sorts into", (name) => {
    const names = ["1700-tal", "Abendlied", "Strax", "Zion", "Över", name].sort(compareCaseInsensitive);
    const keys = names.map(letterGroupKey);

    // Each group is one run in the sorted list: no key comes back after another.
    expect(keys.filter((key, index) => key !== keys[index - 1])).toEqual([...new Set(keys)]);
  });

  it("keeps leading articles", () => {
    expect(letterGroupKey("The Rose")).toBe("T");
  });
});

describe("letterDividerBefore", () => {
  function dividedSequence(names: string[]): string[] {
    return names.flatMap((name, index) => {
      const letter = letterDividerBefore(name, names[index - 1]);
      return letter ? [letter, name] : [name];
    });
  }

  it("starts a group before the first piece", () => {
    expect(letterDividerBefore("Abendlied", undefined)).toBe("A");
  });

  it("puts a divider before the first piece of each group in A→Ö order", () => {
    expect(
      dividedSequence([
        "1700-tal",
        "Abendlied",
        "Ave verum",
        "Bred dina vida vingar",
        "Änglamark",
        "Över berg och dal",
      ]),
    ).toEqual([
      "#",
      "1700-tal",
      "A",
      "Abendlied",
      "Ave verum",
      "B",
      "Bred dina vida vingar",
      "Ä",
      "Änglamark",
      "Ö",
      "Över berg och dal",
    ]);
  });

  it("follows the groups when they are shown Ö→A", () => {
    expect(
      dividedSequence([
        "Över berg och dal",
        "Änglamark",
        "Bred dina vida vingar",
        "Ave verum",
        "Abendlied",
        "1700-tal",
      ]),
    ).toEqual([
      "Ö",
      "Över berg och dal",
      "Ä",
      "Änglamark",
      "B",
      "Bred dina vida vingar",
      "A",
      "Ave verum",
      "Abendlied",
      "#",
      "1700-tal",
    ]);
  });
});
