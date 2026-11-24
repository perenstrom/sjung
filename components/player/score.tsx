"use client";

import type { PlayerSnapshot } from "@/lib/player/player";

/**
 * Where a notation File's score is drawn, in the element given to `attach`,
 * filling the screen on a phone and centred at most 72rem wide on desktop.
 * The engine scrolls it with the cursor. Always light, as printed music is.
 */
export function ScoreArea({
  status,
  attach,
}: {
  status: PlayerSnapshot["status"];
  attach?: (element: HTMLDivElement | null) => void;
}) {
  return (
    <div data-score-scroll className="relative min-h-0 flex-1 overflow-y-auto bg-white text-black">
      {status === "ready" ? null : (
        <p
          className={
            status === "error"
              ? "absolute inset-x-0 top-6 px-6 text-center text-sm text-destructive"
              : "pointer-events-none absolute inset-x-0 top-6 px-6 text-center text-sm text-neutral-500"
          }
        >
          {status === "error" ? "Filen kunde inte spelas upp." : "Laddar noterna…"}
        </p>
      )}
      <div className="mx-auto w-full max-w-[72rem]">
        <div data-score ref={attach} />
      </div>
    </div>
  );
}
