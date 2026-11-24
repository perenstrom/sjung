import { useEffect } from "react";

import type { PieceFileListItem } from "@/components/pieces/types";

/** How often to look again while a File is being prepared; a typical score converts in about a second. */
const REFRESH_INTERVAL_MS = 5000;

/**
 * Refreshes the page through `router` every few seconds while any of the Files is a MuseScore
 * File being prepared for the player (ADR-0009), so it can be played as soon
 * as it is ready, without reloading the page.
 */
export function useRefreshWhilePreparing(files: readonly PieceFileListItem[], router: { refresh: () => void }) {
  const preparing = files.some((file) => file.playback === "preparing");
  useEffect(() => {
    if (!preparing) return;
    const interval = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [preparing, router]);
}
