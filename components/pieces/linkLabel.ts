import type { PieceLink } from "./types";

export function labelForLink(link: PieceLink): string {
  if (link.label && link.label.trim() !== "") {
    return link.label;
  }

  try {
    return new URL(link.url).hostname || link.url;
  } catch {
    return link.url;
  }
}
