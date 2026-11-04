"use client";

// PROTOTYPE — throwaway. Floating switcher for the mobile density variants
// (PER-366). Lives on branch prototype/mobile-density only; never merge.

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import "./prototype-density.css";

const VARIANTS = [
  { key: "today", name: "Today (desktop values)" },
  { key: "comfortable", name: "Comfortable — 16 / 20 / r12" },
  { key: "compact", name: "Compact — 12 / 12 / r8" },
  { key: "flush", name: "Flush — edge-to-edge cards" },
] as const;

// Mirrors prototype-density.css: gutter · section gap · card py/px · card radius · dialog padding
const READOUT: Record<string, string> = {
  comfortable: "gutter 16 · section 20 · card 20/16 · r12 · dialog 20",
  compact: "gutter 12 · section 12 · card 12/12 · r8 · dialog 16",
  flush: "gutter 16 · section 16 (0 between cards) · card 16/16 full-bleed · r0 · dialog 16",
};

export function DensitySwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("density") ?? "today";
  const index = Math.max(
    0,
    VARIANTS.findIndex((v) => v.key === current)
  );
  useEffect(() => {
    const html = document.documentElement;
    if (current === "today") delete html.dataset.density;
    else html.dataset.density = current;
  }, [current]);

  const go = useCallback(
    (delta: number) => {
      const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
      const params = new URLSearchParams(searchParams.toString());
      params.set("density", next.key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [index, pathname, router, searchParams]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, [contenteditable]") )) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="fixed bottom-3 left-1/2 z-[100] flex max-w-[calc(100%-16px)] -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-fuchsia-700 px-2 py-1.5 text-xs text-white shadow-xl">
      <div className="flex items-center gap-2">
        <button type="button" className="size-8 rounded-full hover:bg-white/20" onClick={() => go(-1)}>
          ←
        </button>
        <span className="font-medium whitespace-nowrap">
          {String.fromCharCode(65 + index)} — {VARIANTS[index].name}
        </span>
        <button type="button" className="size-8 rounded-full hover:bg-white/20" onClick={() => go(1)}>
          →
        </button>
      </div>
      <span className="text-[10px] opacity-80">
        {READOUT[current] ?? "no overrides · applies below 768px only"}
      </span>
    </div>
  );
}
