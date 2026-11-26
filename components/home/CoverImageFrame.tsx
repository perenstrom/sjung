"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/** How much slower than the page the image moves while scrolling: 0 moves with it, 1 stands still. */
const PARALLAX_RATE = 0.4;

/**
 * The Cover image's 3:1 frame, the image filling it cropped from the centre
 * and fading into the page background at the bottom. Decorative, so
 * `alt=""`. Home and the upload preview share it, so the preview shows what
 * Home will. With `parallax`, the image scrolls slower than the page.
 */
export function CoverImageFrame({
  src,
  parallax = false,
  className,
}: {
  src: string;
  parallax?: boolean;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  useParallax(parallax, frameRef, imageRef);

  return (
    <div ref={frameRef} className={cn("relative aspect-[3/1] w-full overflow-hidden bg-muted", className)}>
      {/* A signed, short-lived URL behind a redirect: next/image's optimiser can't follow it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={src} alt="" className="size-full object-cover object-center will-change-transform" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent to-background"
      />
    </div>
  );
}

/**
 * Moves the image down by a share of how far the frame's top has scrolled
 * out of view, so it trails the page. Nothing moves while the frame's top is
 * still visible, so no gap ever opens above the image; the frame clips what
 * slides out at the bottom. Off for anyone who prefers reduced motion. Any
 * scroll container counts, since the listener captures every scroll.
 */
function useParallax(
  enabled: boolean,
  frameRef: React.RefObject<HTMLDivElement | null>,
  imageRef: React.RefObject<HTMLImageElement | null>,
) {
  useEffect(() => {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!enabled || !frame || !image || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let scheduled = 0;
    function update() {
      scheduled = 0;
      const { top, bottom } = frame!.getBoundingClientRect();
      if (bottom < 0) return;
      image!.style.transform = `translate3d(0, ${Math.max(0, -top) * PARALLAX_RATE}px, 0)`;
    }
    function schedule() {
      scheduled ||= requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(scheduled);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      image.style.transform = "";
    };
  }, [enabled, frameRef, imageRef]);
}
