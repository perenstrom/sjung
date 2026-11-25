import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { hasLink, renderMarkup, textOf } from "@/lib/testing/markup";
import { CurrentSetListsSection, type CurrentSetListRow } from "./CurrentSetListsSection";

function setList(name: string, dateLabel: string | null, pieceCount: number): CurrentSetListRow {
  return { id: name, slug: name.toLowerCase(), name, dateLabel, pieceCount };
}

function render(setLists: CurrentSetListRow[]): string {
  return renderMarkup(createElement(CurrentSetListsSection, { groupSlug: "kor", setLists }));
}

describe("CurrentSetListsSection", () => {
  it.each([
    [[], "Aktuella repertoarer"],
    [[setList("Lucia", null, 0)], "Aktuell repertoar"],
    [[setList("Lucia", null, 0), setList("Jul", null, 0)], "Aktuella repertoarer"],
  ])("headed for %j Current Set lists as %s", (setLists, heading) => {
    expect(render(setLists)).toContain(`>${heading}</h2>`);
  });

  it("shows each Current Set list in the given order, with its date and Piece count, opening its page", () => {
    const html = render([setList("Lucia", "2026-12-13", 12), setList("Jul", null, 1)]);

    expect(textOf(html)).toContain("Lucia2026-12-13 · 12 stycken");
    expect(textOf(html)).toContain("Jul1 stycke");
    expect(textOf(html).indexOf("Lucia")).toBeLessThan(textOf(html).indexOf("Jul"));
    expect(html).toContain('href="/app/kor/setlists/lucia"');
    expect(html).toContain('href="/app/kor/setlists/jul"');
  });

  it("says so when no Set list is Current", () => {
    expect(textOf(render([]))).toContain("Ingen repertoar är aktuell just nu.");
  });

  it.each([[[]], [[setList("Lucia", null, 3)]]])("always ends with a link to Repertoarer (%j)", (setLists) => {
    const html = render(setLists);

    expect(hasLink(html, "/app/kor/setlists", "Visa alla repertoarer")).toBe(true);
    expect(textOf(html).trim().endsWith("Visa alla repertoarer")).toBe(true);
  });
});
