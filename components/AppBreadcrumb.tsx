"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppBreadcrumbContext } from "@/components/AppBreadcrumbContext";
export function AppBreadcrumb() {
  const { registeredTrail } = useAppBreadcrumbContext();
  if (registeredTrail == null || registeredTrail.visibility === "hidden") {
    return null;
  }

  return (
    <div className="min-w-0 flex-1">
      <Breadcrumb>
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
