"use client";

// PROTOTYPE: throwaway variant switcher. Never merge to main.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type Variant = { key: string; name: string };

export function PrototypeSwitcher({
  variants,
  current,
  children,
}: {
  variants: Variant[];
  current: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  );

  function go(offset: number) {
    const next = variants[(index + offset + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    // Shallow update: Next syncs useSearchParams with native history, so the
    // variant switches without a server round trip and in-memory state survives.
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest("[role=listbox],[role=dialog],[data-radix-popper-content-wrapper]"))
      ) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (process.env.NODE_ENV === "production") return null;

  const variant = variants[index];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 text-sm text-white shadow-xl ring-1 ring-black/20">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          className="rounded-full p-1 hover:bg-white/15"
          aria-label="Föregående variant"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-56 text-center font-medium">
          {variant.key} ({variant.name})
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="rounded-full p-1 hover:bg-white/15"
          aria-label="Nästa variant"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
