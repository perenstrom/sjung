"use client";

// PROTOTYPE — throwaway. Floating bar for flipping between ?variant= keys.
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        target &&
        (target.closest("input, textarea, [contenteditable]") ||
          target.closest("[role=dialog]"))
      ) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 text-sm text-white shadow-lg ring-2 ring-fuchsia-500">
      <button
        type="button"
        onClick={() => go(-1)}
        className="rounded-full px-3 py-1 hover:bg-white/20"
        aria-label="Föregående variant"
      >
        ←
      </button>
      <span className="min-w-[14rem] text-center font-mono">
        {variants[index].key} — {variants[index].name}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="rounded-full px-3 py-1 hover:bg-white/20"
        aria-label="Nästa variant"
      >
        →
      </button>
    </div>
  );
}
