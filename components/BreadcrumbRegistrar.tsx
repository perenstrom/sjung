"use client";

import { useId, useEffect } from "react";
import { type AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";
import { useAppBreadcrumbContext } from "@/components/AppBreadcrumbContext";

type BreadcrumbRegistrarProps = {
  trail: AppBreadcrumbStaticTrail;
};

export function BreadcrumbRegistrar({ trail }: BreadcrumbRegistrarProps) {
  const sourceId = useId();
  const { registerTrail, unregisterTrail } = useAppBreadcrumbContext();

  useEffect(() => {
    registerTrail(sourceId, trail);
    return () => unregisterTrail(sourceId);
  }, [registerTrail, sourceId, trail, unregisterTrail]);

  return null;
}
