import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import type { GroupOverview, GroupOverviewRow } from "@/lib/operators/group-overview";
import { GroupOverviewView } from "./GroupOverviewView";

function row(overrides: Partial<GroupOverviewRow> = {}): GroupOverviewRow {
  return {
    id: "g1",
    name: "Kammarkören",
    slug: "kammarkoren",
    createdAt: new Date("2026-03-04T12:00:00Z"),
    creator: { name: "Bo Ek", email: "bo@example.com" },
    memberCount: 12,
    pieceCount: 34,
    setListCount: 5,
    storageBytes: 3 * 1024 * 1024,
    lastChangedAt: new Date("2026-11-02T12:00:00Z"),
    ...overrides,
  };
}

function render(overview: GroupOverview): string {
  return renderMarkup(createElement(GroupOverviewView, { overview }));
}

describe("GroupOverviewView", () => {
  const html = render({
    groups: [row(), row({ id: "g2", name: "Tomma kören", slug: "tomma", memberCount: 1, pieceCount: 0, setListCount: 0, storageBytes: 0 })],
    totalStorageBytes: 3 * 1024 * 1024,
  });
  const text = textOf(html);

  it("is headed Grupper and sums up the Groups and their storage", () => {
    expect(html).toContain(">Grupper</h1>");
    expect(text).toContain("2 grupper · 3.0 MB totalt");
  });

  it("shows the eight columns", () => {
    for (const heading of ["Namn", "Skapad", "Administratör", "Medlemmar", "Stycken", "Repertoarer", "Lagring", "Senast ändrad"]) {
      expect(html).toContain(`>${heading}</th>`);
    }
  });

  it("shows each Group's metadata", () => {
    expect(text).toContain("kammarkoren");
    expect(text).toContain("2026-03-04");
    expect(text).toContain("Bo Ek");
    expect(text).toContain("bo@example.com");
    expect(text).toContain("3.0 MB");
    expect(text).toContain("2026-11-02");
    expect(text).toContain("0 B");
  });

  it("links into no Group", () => {
    expect(html).not.toContain("<a");
  });

  it("says when there are no Groups", () => {
    expect(textOf(render({ groups: [], totalStorageBytes: 0 }))).toContain("Inga grupper än");
  });

  it("counts a single Group in the singular", () => {
    expect(textOf(render({ groups: [row()], totalStorageBytes: 0 }))).toContain("1 grupp · 0 B totalt");
  });
});
