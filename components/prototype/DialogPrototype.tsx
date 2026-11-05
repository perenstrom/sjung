"use client";

// PROTOTYPE — throwaway. Mobile dialog & popover pattern (PER-369).
// Lives on branch prototype/mobile-dialogs only; never merge to main.
//
// Four dialog variants (?dialog=) and two combobox treatments (?combobox=),
// applied below 768px only via html[data-dialog] / html[data-combobox] and
// prototype-dialogs.css. Also tracks the visual viewport (the part of the
// screen not covered by the on-screen keyboard) into CSS variables:
//   --vv-height  visible height
//   --vv-top     how far the visual viewport is scrolled down in the layout viewport
//   --vv-bottom  height hidden below the visual viewport (≈ keyboard height)

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import "./prototype-dialogs.css";

export const DIALOG_VARIANTS = [
  { key: "A", name: "Idag — centrerad, inget tak" },
  { key: "B", name: "Toppfäst — 16px från toppen" },
  { key: "C", name: "Ark — nedifrån, ovanför tangentbordet" },
  { key: "D", name: "Helskärm — fyller synlig yta" },
] as const;

const COMBOBOX_VARIANTS = [
  { key: "popover", name: "Popover" },
  { key: "inline", name: "Inline" },
] as const;

export function useComboboxVariant(): string {
  const searchParams = useSearchParams();
  return searchParams.get("combobox") === "inline" ? "inline" : "popover";
}

export function DialogPrototype() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogParam = searchParams.get("dialog");
  const dialog = DIALOG_VARIANTS.some((v) => v.key === dialogParam) ? dialogParam! : "B";
  const combobox = searchParams.get("combobox") === "inline" ? "inline" : "popover";
  const index = DIALOG_VARIANTS.findIndex((v) => v.key === dialog);
  const [collapsed, setCollapsed] = useState(false);
  const [vv, setVv] = useState({ height: 0, top: 0, bottom: 0 });

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.dialog = dialog;
    html.dataset.combobox = combobox;
  }, [dialog, combobox]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const html = document.documentElement;
    function update() {
      const v = window.visualViewport!;
      const bottom = Math.max(0, window.innerHeight - (v.height + v.offsetTop));
      html.style.setProperty("--vv-height", `${v.height}px`);
      html.style.setProperty("--vv-top", `${v.offsetTop}px`);
      html.style.setProperty("--vv-bottom", `${bottom}px`);
      setVv({ height: Math.round(v.height), top: Math.round(v.offsetTop), bottom: Math.round(bottom) });
    }
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const go = useCallback(
    (delta: number) => {
      const next = DIALOG_VARIANTS[(index + delta + DIALOG_VARIANTS.length) % DIALOG_VARIANTS.length];
      setParam("dialog", next.key);
    },
    [index, setParam]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;

  if (collapsed) {
    return (
      <button
        type="button"
        data-prototype-bar
        onClick={() => setCollapsed(false)}
        className="fixed bottom-3 left-3 z-[100] flex size-9 items-center justify-center rounded-full bg-fuchsia-700 text-xs font-bold text-white shadow-xl ring-2 ring-white"
        aria-label="Visa prototypfältet"
      >
        {dialog}
      </button>
    );
  }

  return (
    <div
      data-prototype-bar
      className="fixed bottom-3 left-1/2 z-[100] flex max-w-[calc(100%-16px)] -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-fuchsia-700 px-2 py-1.5 text-xs text-white shadow-xl ring-2 ring-white"
    >
      <div className="flex items-center gap-1">
        <button type="button" className="size-8 rounded-full hover:bg-white/20" onClick={() => go(-1)} aria-label="Föregående variant">
          ←
        </button>
        <span className="font-medium whitespace-nowrap">
          {dialog} — {DIALOG_VARIANTS[index].name}
        </span>
        <button type="button" className="size-8 rounded-full hover:bg-white/20" onClick={() => go(1)} aria-label="Nästa variant">
          →
        </button>
        <button type="button" className="size-8 rounded-full hover:bg-white/20" onClick={() => setCollapsed(true)} aria-label="Dölj">
          ✕
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="opacity-80">Person-väljare:</span>
        {COMBOBOX_VARIANTS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setParam("combobox", c.key)}
            className={`rounded-full px-2 py-1 ${combobox === c.key ? "bg-white text-fuchsia-800" : "hover:bg-white/20"}`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <span className="text-[10px] opacity-80">
        synlig höjd {vv.height}px · topp {vv.top}px · tangentbord ≈ {vv.bottom}px · gäller under 768px
      </span>
    </div>
  );
}
