import { describe, expect, it } from "vitest";

import { closestBreadcrumb, createGroupAncestor, createPiecesAncestor, pieceDetailTrail } from "@/lib/breadcrumbs";

describe("createPiecesAncestor", () => {
  it("links Alla noter to the group's pieces page", () => {
    expect(createPiecesAncestor("kor")).toEqual({ label: "Alla noter", href: "/app/kor/pieces" });
  });
});

describe("closestBreadcrumb", () => {
  it("returns null for a hidden trail", () => {
    expect(closestBreadcrumb({ visibility: "hidden" })).toBeNull();
  });

  it("shows the group name as a link on top-level pages", () => {
    expect(
      closestBreadcrumb({
        visibility: "visible",
        ancestors: [createGroupAncestor("kor", "Kören")],
        tail: { kind: "static", label: "Alla noter" },
      }),
    ).toEqual({ kind: "parent", label: "Kören", href: "/app/kor" });
  });

  it("shows a back link to the closest parent on detail pages", () => {
    expect(
      closestBreadcrumb({
        visibility: "visible",
        ancestors: [createGroupAncestor("kor", "Kören"), { label: "Repertoarer", href: "/app/kor/setlists" }],
        tail: { kind: "static", label: "Vårkonsert" },
      }),
    ).toEqual({ kind: "back", label: "Repertoarer", href: "/app/kor/setlists" });
  });

  it("falls back to the current page when there is no parent", () => {
    expect(
      closestBreadcrumb({
        visibility: "visible",
        ancestors: [],
        tail: { kind: "static", label: "Mina grupper" },
      }),
    ).toEqual({ kind: "current", label: "Mina grupper" });
  });
});

describe("pieceDetailTrail", () => {
  it("leads back to the set list the piece was opened from", () => {
    expect(
      pieceDetailTrail({
        groupSlug: "kor",
        groupName: "Kören",
        pieceName: "Vem kan segla",
        fromSetList: { slug: "varkonsert", name: "Vårkonsert" },
      }),
    ).toEqual({
      visibility: "visible",
      ancestors: [
        { label: "Kören", href: "/app/kor" },
        { label: "Repertoarer", href: "/app/kor/setlists" },
        { label: "Vårkonsert", href: "/app/kor/setlists/varkonsert" },
      ],
      tail: { kind: "static", label: "Vem kan segla" },
    });
  });

  const piecesTrail = {
    visibility: "visible",
    ancestors: [
      { label: "Kören", href: "/app/kor" },
      { label: "Alla noter", href: "/app/kor/pieces" },
    ],
    tail: { kind: "static", label: "Vem kan segla" },
  };

  it("leads back to Alla noter when not opened from a set list", () => {
    expect(
      pieceDetailTrail({
        groupSlug: "kor",
        groupName: "Kören",
        pieceName: "Vem kan segla",
        fromSetList: undefined,
      }),
    ).toEqual(piecesTrail);
  });

  it("labels an unnamed set list Repertoar", () => {
    const trail = pieceDetailTrail({
      groupSlug: "kor",
      groupName: "Kören",
      pieceName: "Vem kan segla",
      fromSetList: { slug: "repertoar", name: "" },
    });
    expect(closestBreadcrumb(trail)).toEqual({
      kind: "back",
      label: "Repertoar",
      href: "/app/kor/setlists/repertoar",
    });
  });

  it("labels an unnamed piece Notstycke", () => {
    const trail = pieceDetailTrail({
      groupSlug: "kor",
      groupName: "Kören",
      pieceName: "",
      fromSetList: undefined,
    });
    expect(trail).toMatchObject({ tail: { kind: "static", label: "Notstycke" } });
  });
});
