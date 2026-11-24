import { getThrownMessage } from "@/lib/getThrownMessage";
import { groupMembersPath, groupPath, groupPeoplePath, groupPiecesPath, groupSetListsPath } from "@/lib/groups/routes";

export type GroupNavItem = {
  key: "setLists" | "pieces" | "people" | "members";
  label: string;
  /** `null` when there is no active group: the item shows disabled. */
  href: string | null;
};

/**
 * The sidebar's links into the active group, in order. Repertoarer comes
 * first, as it's the group's start page; Medlemmar only shows to those who
 * can manage members.
 */
export function groupNavItems({
  groupSlug,
  canManageMembers,
}: {
  groupSlug: string | null;
  canManageMembers: boolean;
}): GroupNavItem[] {
  const href = (path: (slug: string) => string) => (groupSlug ? path(groupSlug) : null);
  const items: GroupNavItem[] = [
    { key: "setLists", label: "Repertoarer", href: href(groupSetListsPath) },
    { key: "pieces", label: "Alla noter", href: href(groupPiecesPath) },
    { key: "people", label: "Upphovspersoner", href: href(groupPeoplePath) },
  ];
  if (groupSlug && canManageMembers) {
    items.push({ key: "members", label: "Medlemmar", href: groupMembersPath(groupSlug) });
  }
  return items;
}

/** Whether `pathname` is the page at `path` or a page below it, so its sidebar item shows active. */
export function isAtOrUnder(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

type MobileSidebar = {
  isMobile: boolean;
  setOpenMobile: (open: boolean) => void;
};

/**
 * Close the sidebar sheet after navigating from it on mobile. On desktop the
 * sidebar sits beside the page, so its expanded or collapsed state is kept.
 */
export function closeMobileSidebar({ isMobile, setOpenMobile }: MobileSidebar) {
  if (isMobile) {
    setOpenMobile(false);
  }
}

type SwitchGroupDeps = {
  setActiveGroup: (slug: string) => Promise<void>;
  navigate: (href: string) => void;
  onSwitched: () => void;
};

/**
 * Make `slug` the active group and go to it. Returns a user-visible error
 * message if activation fails, in which case nothing else happens.
 */
export async function switchGroup(
  slug: string,
  { setActiveGroup, navigate, onSwitched }: SwitchGroupDeps,
): Promise<string | null> {
  try {
    await setActiveGroup(slug);
  } catch (err) {
    return getThrownMessage(err, "Kunde inte byta grupp");
  }
  navigate(groupPath(slug));
  onSwitched();
  return null;
}
