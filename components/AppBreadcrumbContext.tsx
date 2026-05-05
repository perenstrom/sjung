"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
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

  const registerTrail = useCallback((sourceId: string, trail: AppBreadcrumbStaticTrail) => {
    setState((current) => {
      if (
        current &&
        current.sourceId === sourceId &&
        JSON.stringify(current.trail) === JSON.stringify(trail)
      ) {
        return current;
      }
      return { sourceId, trail };
    });
  }, []);

  const unregisterTrail = useCallback((sourceId: string) => {
    setState((current) => {
      if (!current || current.sourceId !== sourceId) {
        return current;
      }
      return null;
    });
  }, []);

  const value = useMemo<AppBreadcrumbContextValue>(
    () => ({
      registeredTrail: state?.trail ?? null,
      registerTrail,
      unregisterTrail,
    }),
    [registerTrail, state, unregisterTrail]
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
