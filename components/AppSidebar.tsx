"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
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
import { Boxes, ListMusic, LogOut, Music, UserPlus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/app/actions/groups";
import { logOut } from "@/app/actions/auth";
import { closeMobileSidebar, switchGroup } from "@/lib/sidebar-navigation";

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
  const hasActiveGroup = Boolean(currentGroupSlug);

  const piecesHref = hasActiveGroup ? `/app/${currentGroupSlug}` : null;
  const peopleHref = hasActiveGroup ? `/app/${currentGroupSlug}/people` : null;
  const setListsHref = hasActiveGroup ? `/app/${currentGroupSlug}/setlists` : null;
  const membersHref = currentGroup?.canManageMembers
    ? `/app/${currentGroupSlug}/members`
    : null;
  const groupsHref = "/app/me/groups";

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
        <div className="flex items-center gap-2 px-2 py-1">
          <Music className="size-4" />
          <span className="text-sm font-semibold">Sjung</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>
            {currentGroup?.name ?? "Ingen grupp"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                href={piecesHref}
                label="Noter"
                icon={<Music />}
                isActive={pathname === piecesHref}
              />
              <NavItem
                href={peopleHref}
                label="Personer"
                icon={<Users />}
                isActive={pathname === peopleHref}
              />
              <NavItem
                href={setListsHref}
                label="Repertoarer"
                icon={<ListMusic />}
                isActive={pathname === setListsHref}
              />
              {membersHref ? (
                <NavItem
                  href={membersHref}
                  label="Medlemmar"
                  icon={<UserPlus />}
                  isActive={pathname === membersHref}
                />
              ) : null}
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
      </SidebarFooter>
    </Sidebar>
  );
}
