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
