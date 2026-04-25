"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
} from "@/components/ui/sidebar";
import { Boxes, Music, UserPlus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/app/actions/groups";

type GroupOption = {
  id: string;
  name: string;
  slug: string;
};

function tenantSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || parts.length < 2) return null;
  if (parts[1] === "me") return null;
  return parts[1];
}

type AppSidebarProps = {
  groups: GroupOption[];
  activeGroupSlug: string | null;
};

export function AppSidebar({ groups, activeGroupSlug }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tenantSlug = tenantSlugFromPathname(pathname);
  const currentGroupSlug =
    tenantSlug ?? activeGroupSlug ?? groups[0]?.slug ?? "";
  const currentGroup = groups.find((group) => group.slug === currentGroupSlug);
  const hasActiveGroup = Boolean(currentGroupSlug);

  const noterHref = hasActiveGroup ? `/app/${currentGroupSlug}` : null;
  const peopleHref = hasActiveGroup ? `/app/${currentGroupSlug}/people` : null;
  const membersHref = hasActiveGroup
    ? `/app/${currentGroupSlug}/members`
    : null;
  const groupsHref = "/app/me/groups";

  function handleGroupChange(nextGroupSlug: string) {
    if (!nextGroupSlug || nextGroupSlug === currentGroupSlug) {
      return;
    }

    startTransition(async () => {
      try {
        await setActiveGroup(nextGroupSlug);
        router.push(`/app/${nextGroupSlug}`);
      } catch {
        // Keep UX stable if the server action rejects (e.g. stale membership).
      }
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
              <SidebarMenuItem>
                {noterHref ? (
                  <SidebarMenuButton
                    asChild
                    tooltip="Noter"
                    isActive={pathname === noterHref}
                  >
                    <Link href={noterHref}>
                      <Music />
                      <span>Noter</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip="Noter" disabled>
                    <Music />
                    <span>Noter</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                {peopleHref ? (
                  <SidebarMenuButton
                    asChild
                    tooltip="Personer"
                    isActive={pathname === peopleHref}
                  >
                    <Link href={peopleHref}>
                      <Users />
                      <span>Personer</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip="Personer" disabled>
                    <Users />
                    <span>Personer</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                {membersHref ? (
                  <SidebarMenuButton
                    asChild
                    tooltip="Medlemmar"
                    isActive={pathname === membersHref}
                  >
                    <Link href={membersHref}>
                      <UserPlus />
                      <span>Medlemmar</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip="Medlemmar" disabled>
                    <UserPlus />
                    <span>Medlemmar</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Inställningar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Grupper"
                  isActive={
                    pathname === groupsHref ||
                    pathname.startsWith(`${groupsHref}/`)
                  }
                >
                  <Link href={groupsHref}>
                    <Boxes />
                    <span>Grupphantering</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {groups.length > 1 ? (
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
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
