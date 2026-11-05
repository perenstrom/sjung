import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppBreadcrumbProvider } from "@/components/AppBreadcrumbContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Suspense } from "react";
import { DensitySwitcher } from "@/components/prototype/DensitySwitcher";
import { DialogPrototype } from "@/components/prototype/DialogPrototype";
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
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <AppBreadcrumb />
          </header>
          <main className="p-8 pl-12">{children}</main>
          {/* PROTOTYPE — PER-366 density switcher, never merge */}
          {process.env.NODE_ENV !== "production" ? (
            <Suspense fallback={null}>
              <DensitySwitcher />
              {/* PROTOTYPE — PER-369 dialog variants, never merge */}
              <DialogPrototype />
            </Suspense>
          ) : null}
        </SidebarInset>
      </AppBreadcrumbProvider>
    </SidebarProvider>
  );
}
