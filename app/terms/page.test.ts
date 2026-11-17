import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import TermsOfUsePage from "./page";

describe("the Terms of use page", () => {
  const text = textOf(renderMarkup(createElement(TermsOfUsePage)));

  it.each([
    ["its title", "Användarvillkor"],
    ["when it last changed", "Senast uppdaterad"],
    ["the upload rule", "rätt att lagra digitalt"],
    ["the as-is clause", "i befintligt skick"],
    ["that breaking the Terms has consequences", "tas bort"],
  ])("states %s", (_what, expected) => {
    expect(text).toContain(expected);
  });
});
