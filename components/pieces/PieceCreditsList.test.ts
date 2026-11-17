import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup } from "@/lib/testing/markup";
import { PieceCreditsList, RemoveCreditedPersonButton } from "./PieceCreditsList";

const credits = [
  { personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } },
  { personId: "person-1", role: "Textförfattare", person: { name: "Anna Andersson" } },
];

function renderCredits(): string {
  return renderMarkup(createElement(PieceCreditsList, { credits }));
}

describe("PieceCreditsList", () => {
  it("lets a Person's Credit role badges wrap under the name at every width", () => {
    const html = renderCredits();

    expect(html).toMatch(/<li[^>]*><div class="[^"]*\bflex-wrap\b/);
    expect(html).not.toContain("flex-nowrap");
  });

  it("breaks a long name instead of letting it overflow", () => {
    expect(renderCredits()).toMatch(
      /<span class="[^"]*\bmin-w-0\b[^"]*\bbreak-words\b[^"]*">Anna Andersson</,
    );
  });

  it("ends each Person's row with one remove button, not one per Credit role", () => {
    const html = renderMarkup(
      createElement(PieceCreditsList, {
        credits,
        renderPersonAction: (person) =>
          createElement(RemoveCreditedPersonButton, { person, onRemove: () => {} }),
      }),
    );

    expect(html.match(/aria-label="Ta bort Anna Andersson"/g)).toHaveLength(1);
  });
});
