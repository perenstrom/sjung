import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

// The page's reads reach the database.
vi.mock("@/app/actions/groups", () => ({
  getGroups: async () => [{ slug: "kor", name: "Kören" }],
  getGroupHome: async () => ({
    description: "Vi repar **tisdagar**.",
    coverImageHref: null,
    links: [{ id: "1", label: "Kalender", url: "https://example.se/kalender" }],
    canChange: false,
  }),
  setGroupDescription: async () => {},
}));
vi.mock("@/app/actions/group-links", () => ({}));
vi.mock("@/app/actions/setlists", () => ({
  getCurrentSetLists: async () => [
    { id: "1", slug: "lucia", name: "Lucia", date: new Date("2026-12-13T12:00:00Z"), pieceCount: 12 },
  ],
}));

import { AppBreadcrumbProvider } from "@/components/AppBreadcrumbContext";
import { hasHeading, renderMarkup, textOf } from "@/lib/testing/markup";
import TenantGroupPage from "./page";

describe("a Group's own address", () => {
  it("shows the Group's Home, headed by the Group's name, with its description, Group links and Current Set lists", async () => {
    const page = await TenantGroupPage({ params: Promise.resolve({ groupSlug: "kor" }) });
    const html = renderMarkup(createElement(AppBreadcrumbProvider, null, page));
    const text = textOf(html);

    expect(hasHeading(html, "Kören")).toBe(true);
    expect(hasHeading(html, "Hem")).toBe(false);
    expect(text).toContain("Vi repar tisdagar.");
    expect(text).toContain("Kalender");
    expect(text).toContain("Aktuell repertoar");
    expect(text).toContain("Lucia");
  });
});
