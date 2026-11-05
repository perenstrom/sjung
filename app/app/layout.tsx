import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppBreadcrumbProvider } from "@/components/AppBreadcrumbContext";
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
      <AppBreadcrumbProvider>
        <AppSidebar groups={groups} activeGroupSlug={activeGroupSlug} />
        <SidebarInset className="min-w-0">
          {/* Below md: a 56px bar (plus hairline) that scrolls away, with a flush,
              square, full-height trigger. */}
          <header className="box-content flex h-14 shrink-0 items-center gap-3 border-b pr-4 md:box-border md:h-16 md:gap-2 md:pl-4">
            <SidebarTrigger className="size-14 rounded-none border-r pointer-coarse:size-14 md:size-7 md:rounded-md md:border-r-0 md:pointer-coarse:size-11" />
            <Separator orientation="vertical" className="mx-2 hidden h-4 md:block" />
            <AppBreadcrumb />
          </header>
          <main className="px-4 py-4 md:p-8 md:pl-12">{children}</main>
        </SidebarInset>
      </AppBreadcrumbProvider>
    </SidebarProvider>
  );
}
