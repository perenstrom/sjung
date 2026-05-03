import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { getGroups } from "@/app/actions/groups";
import { getActiveGroupSlugCookie } from "@/lib/active-group-cookie";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const groups = await getGroups();
  const activeGroupSlugFromCookie = await getActiveGroupSlugCookie();
  const activeGroupSlug = groups.some(
    (group) => group.slug === activeGroupSlugFromCookie
  )
    ? activeGroupSlugFromCookie
    : null;

  return (
    <SidebarProvider>
      <AppSidebar groups={groups} activeGroupSlug={activeGroupSlug} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <AppBreadcrumb
            groups={groups.map((group) => ({
              id: group.id,
              name: group.name,
              slug: group.slug,
            }))}
          />
        </header>
        <main className="p-8 pl-12">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
