"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppBreadcrumbContext } from "@/components/AppBreadcrumbContext";
import { type AppBreadcrumbStaticTrail, closestBreadcrumb } from "@/lib/breadcrumbs";

export function AppBreadcrumb() {
  const { registeredTrail } = useAppBreadcrumbContext();
  if (registeredTrail == null || registeredTrail.visibility === "hidden") {
    return null;
  }

  return (
    <div className="min-w-0 flex-1">
      <MobileBreadcrumb trail={registeredTrail} />
      <Breadcrumb className="hidden md:block">
        <BreadcrumbList className="text-muted-foreground sm:gap-2">
          {registeredTrail.ancestors.map((crumb, index) => (
            <Fragment key={`${crumb.href}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ))}
          {registeredTrail.ancestors.length > 0 ? <BreadcrumbSeparator /> : null}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{registeredTrail.tail.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

/** Below `md`: only the closest parent, as a back link on detail pages. */
function MobileBreadcrumb({ trail }: { trail: AppBreadcrumbStaticTrail }) {
  const crumb = closestBreadcrumb(trail);
  if (!crumb) return null;

  return (
    <Breadcrumb className="flex min-w-0 text-sm md:hidden">
      {crumb.kind === "current" ? (
        <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
      ) : (
        <BreadcrumbLink asChild>
          <Link
            href={crumb.href}
            className="-mx-2 flex h-11 min-w-0 items-center gap-1 px-2 text-muted-foreground"
          >
            {crumb.kind === "back" ? (
              <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
            <span className="truncate">{crumb.label}</span>
          </Link>
        </BreadcrumbLink>
      )}
    </Breadcrumb>
  );
}
