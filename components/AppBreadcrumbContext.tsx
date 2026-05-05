"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { type AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";

type AppBreadcrumbContextValue = {
  registeredTrail: AppBreadcrumbStaticTrail | null;
  registerTrail: (sourceId: string, trail: AppBreadcrumbStaticTrail) => void;
  unregisterTrail: (sourceId: string) => void;
};

const AppBreadcrumbContext = createContext<AppBreadcrumbContextValue | null>(null);

export function AppBreadcrumbProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<{
    sourceId: string;
    trail: AppBreadcrumbStaticTrail;
  } | null>(null);

  const value = useMemo<AppBreadcrumbContextValue>(
    () => ({
      registeredTrail: state?.trail ?? null,
      registerTrail: (sourceId, trail) => {
        setState({ sourceId, trail });
      },
      unregisterTrail: (sourceId) => {
        setState((current) => {
          if (!current || current.sourceId !== sourceId) {
            return current;
          }
          return null;
        });
      },
    }),
    [state]
  );

  return <AppBreadcrumbContext.Provider value={value}>{children}</AppBreadcrumbContext.Provider>;
}

export function useAppBreadcrumbContext() {
  const context = useContext(AppBreadcrumbContext);
  if (!context) {
    throw new Error("useAppBreadcrumbContext must be used within AppBreadcrumbProvider");
  }
  return context;
}
