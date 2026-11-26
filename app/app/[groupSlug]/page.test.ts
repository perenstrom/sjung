import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

// The page's reads reach the database.
vi.mock("@/app/actions/groups", () => ({
  getGroups: async () => [{ slug: "kor", name: "Kören" }],
  getGroupDescription: async () => ({ description: "Vi repar **tisdagar**.", canChange: false }),
  setGroupDescription: async () => {},
}));
vi.mock("@/app/actions/setlists", () => ({
  getCurrentSetLists: async () => [
    { id: "1", slug: "lucia", name: "Lucia", date: new Date("2026-12-13T12:00:00Z"), pieceCount: 12 },
  ],
}));

import { AppBreadcrumbProvider } from "@/components/AppBreadcrumbContext";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import TenantGroupPage from "./page";

describe("a Group's own address", () => {
  it("shows the Group's Home, with its description and Current Set lists", async () => {
    const page = await TenantGroupPage({ params: Promise.resolve({ groupSlug: "kor" }) });
    const text = textOf(renderMarkup(createElement(AppBreadcrumbProvider, null, page)));

    expect(text).toContain("Hem");
    expect(text).toContain("Vi repar tisdagar.");
    expect(text).toContain("Aktuell repertoar");
    expect(text).toContain("Lucia");
  });
});
