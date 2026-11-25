import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AccountNameSection } from "./AccountNameSection";
import { renderMarkup, textOf } from "@/lib/testing/markup";

// The form posts to a server action, which reaches the database.
vi.mock("@/app/actions/account", () => ({ changeOwnName: vi.fn() }));

describe("AccountNameSection", () => {
  it("is headed Namn and offers the User's current name to change", () => {
    const html = renderMarkup(createElement(AccountNameSection, { name: "Anna Andersson" }));

    expect(textOf(html)).toContain("Namn");
    expect(textOf(html)).toContain("Spara");
    expect(html).toMatch(/<input[^>]*name="name"[^>]*value="Anna Andersson"/);
  });
});
