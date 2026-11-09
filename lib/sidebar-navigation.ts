import { getThrownMessage } from "@/lib/getThrownMessage";

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
  navigate(`/app/${slug}`);
  onSwitched();
  return null;
}
