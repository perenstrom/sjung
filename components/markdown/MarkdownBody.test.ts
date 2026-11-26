import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { renderMarkup } from "@/lib/testing/markup";

function render(markdown: string): string {
  return renderMarkup(createElement(MarkdownBody, { markdown }));
}

describe("MarkdownBody", () => {
  it("renders GFM: headings, emphasis, lists and tables", () => {
    const html = render("## Nytt\n\n**Fet** och *kursiv*\n\n- ett\n- två\n\n| A | B |\n| - | - |\n| 1 | 2 |");

    expect(html).toContain("<h2>Nytt</h2>");
    expect(html).toContain("<strong>Fet</strong>");
    expect(html).toContain("<em>kursiv</em>");
    expect(html).toContain("<li>två</li>");
    expect(html).toMatch(/<table>[\s\S]*<td>2<\/td>/);
  });

  it("does not render raw HTML", () => {
    const html = render('Hej <script>alert(1)</script> <b onclick="x()">där</b>');

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b");
  });

  it("does not render images", () => {
    expect(render("![Bild](https://example.com/bild.png)")).not.toContain("<img");
  });

  it("opens external links in a new tab without handing over the opener", () => {
    const html = render("[Sjung](https://example.com)");

    expect(html).toMatch(/<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">Sjung<\/a>/);
  });

  it("opens links within Sjung in the same tab", () => {
    expect(render("[Mitt konto](/app/me/account)")).toContain('<a href="/app/me/account">Mitt konto</a>');
  });

  it("drops script links", () => {
    expect(render("[klick](javascript:alert(1))")).not.toContain("javascript:");
  });
});
