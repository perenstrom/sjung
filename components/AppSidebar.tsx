"use client";

import { usePathname } from "next/navigation";
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
import { Boxes, Music, Users } from "lucide-react";

function tenantSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || parts.length < 2) return null;
  if (parts[1] === "me") return null;
  return parts[1];
}

export function AppSidebar() {
  const pathname = usePathname();
  const tenantSlug = tenantSlugFromPathname(pathname);

  const noterHref = tenantSlug ? `/app/${tenantSlug}` : null;
  const peopleHref = tenantSlug ? `/app/${tenantSlug}/people` : null;
  const groupsHref = "/app/me/groups";

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>Sjung</SidebarHeader>
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
