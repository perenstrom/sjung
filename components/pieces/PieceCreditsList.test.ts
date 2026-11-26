import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { hasLink, renderMarkup } from "@/lib/testing/markup";
import { PieceCreditsList, RemoveCreditedPersonButton } from "./PieceCreditsList";

const credits = [
  { personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } },
  { personId: "person-1", role: "Textförfattare", person: { name: "Anna Andersson" } },
];

function renderCredits(): string {
  return renderMarkup(createElement(PieceCreditsList, { credits }));
}

describe("PieceCreditsList", () => {
  it("ends each Person's row with one remove button, not one per Credit role", () => {
    const html = renderMarkup(
      createElement(PieceCreditsList, {
        credits,
        renderPersonAction: (person) => createElement(RemoveCreditedPersonButton, { person, onRemove: () => {} }),
      }),
    );

    expect(html.match(/aria-label="Ta bort Anna Andersson"/g)).toHaveLength(1);
  });

  it("links each name to the Person's page when given personHref", () => {
    const html = renderMarkup(
      createElement(PieceCreditsList, {
        credits,
        personHref: (personId) => `/app/kor/people/${personId}`,
      }),
    );

    expect(hasLink(html, "/app/kor/people/person-1", "Anna Andersson")).toBe(true);
  });

  it("shows names as plain text without personHref, as in Alla noter", () => {
    expect(renderCredits()).not.toContain("<a");
  });
});
