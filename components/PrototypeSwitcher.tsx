"use client";

// PROTOTYPE — throwaway. Floating bar that cycles ?variant= on the current page.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

export function PrototypeSwitcher({
  variants,
}: {
  variants: readonly { key: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("variant") ?? variants[0].key;
  const index = Math.max(0, variants.findIndex((v) => v.key === current));

  const go = useCallback(
    (step: number) => {
      const next = variants[(index + step + variants.length) % variants.length];
      const params = new URLSearchParams(searchParams);
      params.set("variant", next.key);
      router.replace(`${pathname}?${params}`, { scroll: false });
    },
    [index, pathname, router, searchParams, variants]
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;

  const variant = variants[index];
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1.5 text-sm text-white shadow-lg">
      <button type="button" className="rounded-full p-1 hover:bg-white/20" onClick={() => go(-1)} aria-label="Föregående variant">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-28 text-center font-medium">
        {variant.key} — {variant.name}
      </span>
      <button type="button" className="rounded-full p-1 hover:bg-white/20" onClick={() => go(1)} aria-label="Nästa variant">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
