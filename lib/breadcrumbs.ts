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
