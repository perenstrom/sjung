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
};

export function AppSidebar({ groups }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tenantSlug = tenantSlugFromPathname(pathname);
  const currentGroupSlug = tenantSlug ?? groups[0]?.slug ?? "";
  const currentGroup = groups.find((group) => group.slug === currentGroupSlug);

  const noterHref = tenantSlug ? `/app/${tenantSlug}` : null;
  const peopleHref = tenantSlug ? `/app/${tenantSlug}/people` : null;
  const membersHref = tenantSlug ? `/app/${tenantSlug}/members` : null;
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
        <div className="px-2 py-1 text-sm font-semibold">Sjung</div>
        {groups.length <= 1 ? (
          <div className="px-2 text-xs text-muted-foreground">
            {currentGroup?.name ?? "Ingen grupp"}
          </div>
        ) : (
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
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sjung</SidebarGroupLabel>
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

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Grupper"
                  isActive={
                    pathname === groupsHref || pathname.startsWith(`${groupsHref}/`)
                  }
                >
                  <Link href={groupsHref}>
                    <Boxes />
                    <span>Grupper</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
