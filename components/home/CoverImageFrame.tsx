import { cn } from "@/lib/utils";

/**
 * The Cover image's fixed 3:1 frame, full width, the image filling it cropped
 * from the centre. Decorative, so `alt=""`. Home and the upload preview share
 * it, so the preview shows exactly what Home will.
 */
export function CoverImageFrame({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("aspect-[3/1] w-full overflow-hidden rounded-lg bg-muted", className)}>
      {/* A signed, short-lived URL behind a redirect: next/image's optimiser can't follow it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-cover object-center" />
    </div>
  );
}
