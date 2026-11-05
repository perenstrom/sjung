import { describe, expect, it } from "vitest";

import { closestBreadcrumb, createGroupAncestor } from "@/lib/breadcrumbs";

describe("closestBreadcrumb", () => {
  it("returns null for a hidden trail", () => {
    expect(closestBreadcrumb({ visibility: "hidden" })).toBeNull();
  });

  it("shows the group name as a link on top-level pages", () => {
    expect(
      closestBreadcrumb({
        visibility: "visible",
        ancestors: [createGroupAncestor("kor", "Kören")],
        tail: { kind: "static", label: "Noter" },
      })
    ).toEqual({ kind: "parent", label: "Kören", href: "/app/kor" });
  });

  it("shows a back link to the closest parent on detail pages", () => {
    expect(
      closestBreadcrumb({
        visibility: "visible",
        ancestors: [
          createGroupAncestor("kor", "Kören"),
          { label: "Repertoarer", href: "/app/kor/setlists" },
        ],
        tail: { kind: "static", label: "Vårkonsert" },
      })
    ).toEqual({ kind: "back", label: "Repertoarer", href: "/app/kor/setlists" });
  });

  it("falls back to the current page when there is no parent", () => {
    expect(
      closestBreadcrumb({
        visibility: "visible",
        ancestors: [],
        tail: { kind: "static", label: "Grupphantering" },
      })
    ).toEqual({ kind: "current", label: "Grupphantering" });
  });
});
