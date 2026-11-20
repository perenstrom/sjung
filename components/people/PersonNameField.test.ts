import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PersonNameField } from "./PersonNameField";

const PEOPLE = [
  { id: "hugo", name: "Hugo Alfvén" },
  { id: "anna", name: "Anna Åström" },
];

function render(defaultValue: string, exceptId?: string): string {
  return textOf(renderMarkup(createElement(PersonNameField, { people: PEOPLE, defaultValue, exceptId })));
}

describe("PersonNameField", () => {
  it("hints, with the existing spelling, when another Person has the name", () => {
    expect(render("hugo  alfvén")).toContain("Det finns redan en upphovsperson som heter Hugo Alfvén");
  });

  it.each([
    ["a new name", "Wilhelm Stenhammar", undefined],
    ["the Person's own name in another letter case", "HUGO ALFVÉN", "hugo"],
  ])("gives no hint for %s", (_case, name, exceptId) => {
    expect(render(name, exceptId)).not.toContain("Det finns redan");
  });
});
