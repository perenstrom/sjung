"use client";

import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Boxes, CircleUser, ListMusic, LogOut, Music, Newspaper, ScrollText, ShieldCheck, UserPlus, Users } from "lucide-react";
import { logOut } from "@/app/actions/auth";
import {
  closeMobileSidebar,
  groupNavItems,
  isAtOrUnder,
  type GroupNavItem,
} from "@/lib/sidebar-navigation";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { UnreadDot } from "@/components/announcements/UnreadDot";
import { brandMarkSrc } from "@/lib/app-environment";
import { ACCOUNT_PATH } from "@/lib/account/routes";
import { ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";
import { isReservedGroupSlug } from "@/lib/group-slug";
import { MY_GROUPS_PATH } from "@/lib/groups/routes";
import { PRIVACY_POLICY_PATH, TERMS_OF_USE_PATH } from "@/lib/legal/routes";

const navItemIcons: Record<GroupNavItem["key"], ReactNode> = {
  setLists: <ListMusic />,
  pieces: <Music />,
  people: <Users />,
  members: <UserPlus />,
};

type GroupOption = {
  id: string;
  name: string;
  slug: string;
  canManageMembers: boolean;
};

function tenantSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || parts.length < 2) return null;
  if (isReservedGroupSlug(parts[1])) return null;
  return parts[1];
}

type NavItemProps = {
  /** `null` renders the item disabled, e.g. when there is no active group. */
  href: string | null;
  label: string;
  icon: ReactNode;
  isActive: boolean;
  /** Shown when the sidebar is collapsed to icons; defaults to `label`. */
  tooltip?: string;
  /** Shown after the label, e.g. an unread dot. */
  children?: ReactNode;
};

function NavItem({ href, label, icon, isActive, tooltip = label, children }: NavItemProps) {
  const sidebar = useSidebar();

  return (
    <SidebarMenuItem>
      {href ? (
        <SidebarMenuButton asChild tooltip={tooltip} isActive={isActive}>
          <Link href={href} onClick={() => closeMobileSidebar(sidebar)}>
            {icon}
            <span>{label}</span>
            {children}
          </Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton tooltip={label} disabled>
          {icon}
          <span>{label}</span>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
}

/**
 * Nyheter, with a blue dot while any Announcement is unread: after the label,
 * or in the icon's corner when the sidebar is collapsed to icons. No count.
 */
function AnnouncementsNavItem({ hasUnread, isActive }: { hasUnread: boolean; isActive: boolean }) {
  return (
    <NavItem
      href={ANNOUNCEMENTS_PATH}
      label="Nyheter"
      icon={<Newspaper />}
      isActive={isActive}
      tooltip={hasUnread ? "Nyheter (olästa finns)" : "Nyheter"}
    >
      {hasUnread ? (
        <>
          <UnreadDot className="ml-auto group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1" />
          <span className="sr-only">, olästa finns</span>
        </>
      ) : null}
    </NavItem>
  );
}

type AppSidebarProps = {
  groups: GroupOption[];
  activeGroupSlug: string | null;
  /** Whether the User has any unread Announcement. */
  hasUnreadAnnouncements: boolean;
};

export function AppSidebar({ groups, activeGroupSlug, hasUnreadAnnouncements }: AppSidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, startLogOutTransition] = useTransition();
  const tenantSlug = tenantSlugFromPathname(pathname);
  const currentGroupSlug =
    tenantSlug ?? activeGroupSlug ?? groups[0]?.slug ?? "";
  const currentGroup = groups.find((group) => group.slug === currentGroupSlug);

  const navItems = groupNavItems({
    groupSlug: currentGroupSlug || null,
    canManageMembers: currentGroup?.canManageMembers ?? false,
  });
  const groupsHref = MY_GROUPS_PATH;

  function handleLogOut() {
    startLogOutTransition(async () => {
      await logOut();
    });
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* A menu button only for its collapse behaviour: the logo isn't
                interactive, so it renders as a div without hover styles. */}
            <SidebarMenuButton
              asChild
              size="lg"
              className="hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground"
            >
              <div>
                <Image
                  src={brandMarkSrc}
                  alt="Sjung"
                  width={32}
                  height={32}
                  className="size-8 shrink-0"
                />
                <span
                  aria-hidden="true"
                  className="font-semibold group-data-[collapsible=icon]:hidden"
                >
                  Sjung
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>
            {currentGroup?.name ?? "Ingen grupp"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem
                  key={item.key}
                  href={item.href}
                  label={item.label}
                  icon={navItemIcons[item.key]}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Inställningar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                href={groupsHref}
                label="Mina grupper"
                icon={<Boxes />}
                isActive={isAtOrUnder(pathname, groupsHref)}
              />
              <NavItem
                href={ACCOUNT_PATH}
                label="Mitt konto"
                icon={<CircleUser />}
                isActive={pathname === ACCOUNT_PATH}
              />
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Logga ut"
                  onClick={handleLogOut}
                  disabled={isLoggingOut}
                >
                  <LogOut />
                  <span>Logga ut</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <GroupSwitcher groups={groups} currentGroupSlug={currentGroupSlug} />
        <SidebarMenu>
          <AnnouncementsNavItem
            hasUnread={hasUnreadAnnouncements}
            isActive={isAtOrUnder(pathname, ANNOUNCEMENTS_PATH)}
          />
          <FeedbackDialog pagePath={pathname} groupSlug={tenantSlug} />
          <NavItem
            href={PRIVACY_POLICY_PATH}
            label="Integritetspolicy"
            icon={<ShieldCheck />}
            isActive={false}
          />
          <NavItem
            href={TERMS_OF_USE_PATH}
            label="Användarvillkor"
            icon={<ScrollText />}
            isActive={false}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
