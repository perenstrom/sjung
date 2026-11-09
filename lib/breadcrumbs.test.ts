import { describe, expect, it } from "vitest";

import { closestBreadcrumb, createGroupAncestor, pieceDetailTrail } from "@/lib/breadcrumbs";

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
        tail: { kind: "static", label: "Mina grupper" },
      })
    ).toEqual({ kind: "current", label: "Mina grupper" });
  });
});

describe("pieceDetailTrail", () => {
  const setLists = [
    { id: "sl-1", name: "Vårkonsert" },
    { id: "sl-2", name: "" },
  ];

  it("leads back to the set list the piece was opened from", () => {
    expect(
      pieceDetailTrail({
        groupSlug: "kor",
        groupName: "Kören",
        pieceName: "Vem kan segla",
        setLists,
        fromSetListId: "sl-1",
      })
    ).toEqual({
      visibility: "visible",
      ancestors: [
        { label: "Kören", href: "/app/kor" },
        { label: "Repertoarer", href: "/app/kor/setlists" },
        { label: "Vårkonsert", href: "/app/kor/setlists/sl-1" },
      ],
      tail: { kind: "static", label: "Vem kan segla" },
    });
  });

  const noterTrail = {
    visibility: "visible",
    ancestors: [
      { label: "Kören", href: "/app/kor" },
      { label: "Noter", href: "/app/kor" },
    ],
    tail: { kind: "static", label: "Vem kan segla" },
  };

  it("leads back to Noter when not opened from a set list", () => {
    expect(
      pieceDetailTrail({
        groupSlug: "kor",
        groupName: "Kören",
        pieceName: "Vem kan segla",
        setLists,
        fromSetListId: undefined,
      })
    ).toEqual(noterTrail);
  });

  it("leads back to Noter when the set list isn't one of this group's", () => {
    expect(
      pieceDetailTrail({
        groupSlug: "kor",
        groupName: "Kören",
        pieceName: "Vem kan segla",
        setLists,
        fromSetListId: "sl-from-another-group",
      })
    ).toEqual(noterTrail);
  });

  it("labels an unnamed set list Repertoar", () => {
    const trail = pieceDetailTrail({
      groupSlug: "kor",
      groupName: "Kören",
      pieceName: "Vem kan segla",
      setLists,
      fromSetListId: "sl-2",
    });
    expect(closestBreadcrumb(trail)).toEqual({
      kind: "back",
      label: "Repertoar",
      href: "/app/kor/setlists/sl-2",
    });
  });

  it("labels an unnamed piece Notstycke", () => {
    const trail = pieceDetailTrail({
      groupSlug: "kor",
      groupName: "Kören",
      pieceName: "",
      setLists,
      fromSetListId: undefined,
    });
    expect(trail).toMatchObject({ tail: { kind: "static", label: "Notstycke" } });
  });
});
