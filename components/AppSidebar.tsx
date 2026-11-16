"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
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
// PROTOTYPE (PER-430), throwaway: in-memory read state for the Nyheter item.
import { prototypeHref, useRememberedVariant, useUnreadCount } from "@/app/app/nyheter-prototype/_prototype/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/app/actions/groups";
import { logOut } from "@/app/actions/auth";
import {
  closeMobileSidebar,
  groupNavItems,
  switchGroup,
  type GroupNavItem,
} from "@/lib/sidebar-navigation";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { brandMarkSrc } from "@/lib/app-environment";
import { ACCOUNT_PATH } from "@/lib/account/routes";
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
  if (parts[1] === "me") return null;
  return parts[1];
}

type NavItemProps = {
  /** `null` renders the item disabled, e.g. when there is no active group. */
  href: string | null;
  label: string;
  icon: ReactNode;
  isActive: boolean;
};

function NavItem({ href, label, icon, isActive }: NavItemProps) {
  const sidebar = useSidebar();

  return (
    <SidebarMenuItem>
      {href ? (
        <SidebarMenuButton asChild tooltip={label} isActive={isActive}>
          <Link href={href} onClick={() => closeMobileSidebar(sidebar)}>
            {icon}
            <span>{label}</span>
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

// PROTOTYPE (PER-430), throwaway: Nyheter with an unread dot, no count. The dot
// sits after the label, and moves to the icon's corner when the sidebar is
// collapsed to icons.
function PrototypeAnnouncementsNavItem({ isActive }: { isActive: boolean }) {
  const sidebar = useSidebar();
  const unread = useUnreadCount();
  const variant = useRememberedVariant();
  const label = unread > 0 ? "Nyheter (olästa)" : "Nyheter";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={label} isActive={isActive}>
        <Link href={prototypeHref(variant)} onClick={() => closeMobileSidebar(sidebar)}>
          <Newspaper />
          <span>Nyheter</span>
          {unread > 0 ? (
            <>
              <span className="ml-auto size-2 bg-blue-500 shrink-0 rounded-full group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1" />
              <span className="sr-only">, olästa finns</span>
            </>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

type AppSidebarProps = {
  groups: GroupOption[];
  activeGroupSlug: string | null;
};

export function AppSidebar({ groups, activeGroupSlug }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebar = useSidebar();
  const [groupSwitchError, setGroupSwitchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

  function handleGroupChange(nextGroupSlug: string) {
    if (!nextGroupSlug || nextGroupSlug === currentGroupSlug) {
      return;
    }

    startTransition(async () => {
      setGroupSwitchError(null);
      const error = await switchGroup(nextGroupSlug, {
        setActiveGroup,
        navigate: (href) => router.push(href),
        onSwitched: () => closeMobileSidebar(sidebar),
      });
      setGroupSwitchError(error);
    });
  }

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
                isActive={
                  pathname === groupsHref ||
                  pathname.startsWith(`${groupsHref}/`)
                }
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
        {groups.length > 1 ? (
          <div className="space-y-1">
            <Select
              value={currentGroupSlug}
              onValueChange={handleGroupChange}
              disabled={isPending}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Välj grupp" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.slug}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupSwitchError ? (
              <p
                role="status"
                aria-live="polite"
                className="text-sm text-destructive"
              >
                {groupSwitchError}
              </p>
            ) : null}
          </div>
        ) : null}
        <SidebarMenu>
          <PrototypeAnnouncementsNavItem isActive={pathname.startsWith("/app/nyheter-prototype")} />
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
