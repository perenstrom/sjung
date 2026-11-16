"use client";

// PROTOTYPE (PER-430), throwaway. Read state lives in module memory only, so
// it survives client-side navigation and resets on a full reload.

import { useSyncExternalStore } from "react";
import { ANNOUNCEMENTS } from "./data";

export const VARIANTS = ["A", "B", "C"] as const;
export type Variant = (typeof VARIANTS)[number];
export const VARIANT_NAMES: Record<Variant, string> = {
  A: "Lista + egen sida",
  B: "Delad vy (inkorg)",
  C: "Tidslinje",
};

const INITIALLY_READ = new Set(["a4", "a5", "a6"]);

let readIds = new Set(INITIALLY_READ);
let variant: Variant = "A";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markRead(id: string) {
  if (readIds.has(id)) return;
  readIds = new Set(readIds).add(id);
  emit();
}

export function markAllRead() {
  readIds = new Set(ANNOUNCEMENTS.map((a) => a.id));
  emit();
}

export function resetReadState() {
  readIds = new Set(INITIALLY_READ);
  emit();
}

export function rememberVariant(next: Variant) {
  if (variant === next) return;
  variant = next;
  emit();
}

export function useReadIds() {
  return useSyncExternalStore(subscribe, () => readIds, () => INITIALLY_READ);
}

export function useRememberedVariant() {
  return useSyncExternalStore(subscribe, () => variant, () => "A" as Variant);
}

export function useUnreadCount() {
  const ids = useReadIds();
  return ANNOUNCEMENTS.filter((a) => !ids.has(a.id)).length;
}

export function parseVariant(value: string | string[] | undefined): Variant {
  return VARIANTS.includes(value as Variant) ? (value as Variant) : "A";
}

export function prototypeHref(variant: Variant, id?: string) {
  return `/app/nyheter-prototype${id ? `/${id}` : ""}?variant=${variant}`;
}
