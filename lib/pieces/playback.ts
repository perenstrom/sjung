import type { FileConversionState } from "@/app/generated/prisma/enums";
import { needsConversion, playableFormatOf } from "@/lib/file-formats";

/**
 * Whether a Playable File can be played now: `ready`, or for a MuseScore
 * File still `preparing` or `failed` to be prepared (ADR-0009).
 */
export type Playback = "ready" | "preparing" | "failed";

/** The File's Playback, or `null` when it isn't a Playable File (see CONTEXT.md). */
export function playbackOf(file: { fileName: string; conversionState?: FileConversionState | null }): Playback | null {
  if (!playableFormatOf(file)) return null;
  if (!needsConversion(file)) return "ready";
  switch (file.conversionState) {
    case "READY":
      return "ready";
    case "FAILED":
      return "failed";
    default:
      return "preparing";
  }
}
