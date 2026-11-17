"use client";

// PROTOTYPE (PER-431) — throwaway. Floating bar that cycles `?variant=`.
// Never merge to main.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function PrototypeSwitcher({
  variants,
}: {
  variants: { key: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("variant") ?? variants[0].key;
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  );

  function go(step: number) {
    const next = variants[(index + step + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, [contenteditable], [role=dialog]")
      ) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    // Above dialogs (z-50) so it can be used with the New Piece dialog open.
    <div className="pointer-events-auto fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-fuchsia-700 px-2 py-1 text-sm text-white shadow-lg">
      <button
        type="button"
        onClick={() => go(-1)}
        className="rounded-full p-1 hover:bg-white/20"
        aria-label="Föregående variant"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="font-medium whitespace-nowrap">
        PROTOTYP {variants[index].key} — {variants[index].name}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="rounded-full p-1 hover:bg-white/20"
        aria-label="Nästa variant"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export const CREDIT_ROLE_VARIANTS = [
  { key: "A", name: "Rolldropdown med kryssrutor" },
  { key: "B", name: "Rollchips med fritext" },
  { key: "C", name: "Som Linears etiketter" },
];
