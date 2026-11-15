import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup } from "@/lib/testing/markup";
import { PieceCreditsList } from "./PieceCreditsList";

function renderCredits(): string {
  return renderMarkup(
    createElement(PieceCreditsList, {
      credits: [
        { personId: "person-1", role: "Kompositör", person: { name: "Anna Andersson" } },
        { personId: "person-1", role: "Textförfattare", person: { name: "Anna Andersson" } },
      ],
    }),
  );
}

describe("PieceCreditsList", () => {
  it("lets a Person's Credit role badges wrap under the name at every width", () => {
    const html = renderCredits();

    expect(html).toMatch(/<li class="[^"]*\bflex-wrap\b/);
    expect(html).not.toContain("flex-nowrap");
  });

  it("breaks a long name instead of letting it overflow", () => {
    expect(renderCredits()).toMatch(
      /<span class="[^"]*\bmin-w-0\b[^"]*\bbreak-words\b[^"]*">Anna Andersson</,
    );
  });
});
