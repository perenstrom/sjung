"use client";

// PROTOTYPE — throwaway. Lives only on the prototype/* branch; never merge to main.
// Floating bar that cycles `?variant=` between prototype variants.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

export type PrototypeVariant = { key: string; name: string };

export function usePrototypeVariant(variants: PrototypeVariant[]): string {
  const searchParams = useSearchParams();
  const value = searchParams.get("variant");
  return variants.some((v) => v.key === value) ? value! : variants[0].key;
}

export function PrototypeSwitcher({ variants }: { variants: PrototypeVariant[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = usePrototypeVariant(variants);
  const index = variants.findIndex((v) => v.key === current);

  const go = useCallback(
    (delta: number) => {
      const next = variants[(index + delta + variants.length) % variants.length];
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", next.key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [index, pathname, router, searchParams, variants]
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-fuchsia-700 px-1 py-1 text-sm text-white shadow-lg ring-2 ring-white">
        <button
          type="button"
          onClick={() => go(-1)}
          className="flex size-9 items-center justify-center rounded-full hover:bg-white/20"
          aria-label="Föregående variant"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 font-medium whitespace-nowrap">
          {variants[index].key} — {variants[index].name}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="flex size-9 items-center justify-center rounded-full hover:bg-white/20"
          aria-label="Nästa variant"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
