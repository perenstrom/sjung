export type AppBreadcrumbAncestor = {
  label: string;
  href: string;
};

export type AppBreadcrumbStaticTrail =
  | { visibility: "hidden" }
  | {
      visibility: "visible";
      ancestors: AppBreadcrumbAncestor[];
      tail: { kind: "static"; label: string };
    };

export function createGroupAncestor(
  groupSlug: string,
  groupName: string
): AppBreadcrumbAncestor {
  return {
    label: groupName,
    href: `/app/${groupSlug}`,
  };
}

export function createSetListsAncestor(groupSlug: string): AppBreadcrumbAncestor {
  return { label: "Repertoarer", href: `/app/${groupSlug}/setlists` };
}

/** A Set list's crumb label: its name, or "Repertoar" when it has none. */
export function setListCrumbLabel(setListName: string): string {
  return setListName || "Repertoar";
}

export type ClosestBreadcrumb =
  | { kind: "back"; label: string; href: string }
  | { kind: "parent"; label: string; href: string }
  | { kind: "current"; label: string };

/**
 * The single crumb shown below `md`: the closest parent only. Detail pages
 * (nested below a top-level page) get a back link; top-level pages show the
 * group they belong to.
 */
export function closestBreadcrumb(
  trail: AppBreadcrumbStaticTrail
): ClosestBreadcrumb | null {
  if (trail.visibility === "hidden") return null;

  const parent = trail.ancestors.at(-1);
  if (!parent) return { kind: "current", label: trail.tail.label };

  return {
    kind: trail.ancestors.length > 1 ? "back" : "parent",
    label: parent.label,
    href: parent.href,
  };
}

/**
 * A Piece's trail. Opened from a Set list (`fromSetListId`, the `setlist`
 * search param), it leads back to that Set list.
 */
export function pieceDetailTrail({
  groupSlug,
  groupName,
  pieceName,
  setLists,
  fromSetListId,
}: {
  groupSlug: string;
  groupName: string;
  pieceName: string;
  setLists: { id: string; name: string }[];
  fromSetListId: string | undefined;
}): AppBreadcrumbStaticTrail {
  const setList = setLists.find((candidate) => candidate.id === fromSetListId);
  return {
    visibility: "visible",
    ancestors: [
      createGroupAncestor(groupSlug, groupName),
      ...(setList
        ? [
            createSetListsAncestor(groupSlug),
            {
              label: setListCrumbLabel(setList.name),
              href: `/app/${groupSlug}/setlists/${setList.id}`,
            },
          ]
        : [{ label: "Noter", href: `/app/${groupSlug}` }]),
    ],
    tail: { kind: "static", label: pieceName || "Notstycke" },
  };
}
