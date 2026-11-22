"use client";

// PROTOTYPE switcher: a floating bar that cycles `?variant=` on the current route.
// Never rendered in production builds.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

type Variant = { key: string; name: string };

export function PrototypeSwitcher({
  variants,
  current,
  inline = false,
  arrowKeys = true,
}: {
  variants: readonly Variant[];
  current: string;
  /** Render in place instead of floating at the bottom of the screen. */
  inline?: boolean;
  /** Cycle with ← and →. Off where the page itself uses the arrow keys. */
  arrowKeys?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  const go = useCallback(
    (step: number) => {
      const next = variants[(index + step + variants.length) % variants.length];
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", next.key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [index, variants, searchParams, pathname, router],
  );

  useEffect(() => {
    if (!arrowKeys) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=''], [contenteditable='true']",
        )
      ) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, arrowKeys]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const variant = variants[index];
  return (
    <div
      className={
        inline
          ? "flex shrink-0 items-center gap-0.5 rounded-full bg-black px-1 text-xs text-white"
          : "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1.5 text-sm text-white shadow-lg"
      }
    >
      <button
        type="button"
        aria-label="Previous variant"
        className="rounded-full p-2 hover:bg-white/20"
        onClick={() => go(-1)}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 whitespace-nowrap">
        {variant.key} ({variant.name})
      </span>
      <button
        type="button"
        aria-label="Next variant"
        className="rounded-full p-2 hover:bg-white/20"
        onClick={() => go(1)}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
