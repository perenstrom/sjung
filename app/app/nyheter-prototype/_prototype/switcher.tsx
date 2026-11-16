"use client";

// PROTOTYPE (PER-430), throwaway. Floating variant switcher; hidden in
// production builds.

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { ANNOUNCEMENTS } from "./data";
import { prototypeHref, resetReadState, useReadIds, VARIANT_NAMES, VARIANTS, type Variant } from "./store";

export function PrototypeSwitcher({ current, selectedId }: { current: Variant; selectedId: string | null }) {
  const router = useRouter();
  const readIds = useReadIds();
  const index = VARIANTS.indexOf(current);

  function go(step: number) {
    const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length];
    router.replace(prototypeHref(next, selectedId ?? undefined));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  const unread = ANNOUNCEMENTS.filter((a) => !readIds.has(a.id)).map((a) => a.id);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-900 px-2 py-1.5 text-sm text-white shadow-lg ring-1 ring-white/10">
      <button className="rounded-full p-1 hover:bg-white/10" onClick={() => go(-1)} aria-label="Föregående variant">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-44 px-1 text-center font-medium">
        {current} · {VARIANT_NAMES[current]}
      </span>
      <button className="rounded-full p-1 hover:bg-white/10" onClick={() => go(1)} aria-label="Nästa variant">
        <ChevronRight className="size-4" />
      </button>
      <span className="mx-1 h-4 w-px bg-white/20" />
      <span className="px-1 font-mono text-xs text-white/70" title="Olästa (prototypens minne)">
        oläst: {unread.length ? unread.join(",") : "–"}
      </span>
      <button
        className="rounded-full p-1 hover:bg-white/10"
        onClick={resetReadState}
        aria-label="Återställ lässtatus"
        title="Återställ lässtatus"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  );
}
