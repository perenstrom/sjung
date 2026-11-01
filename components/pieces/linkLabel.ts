import type { PieceLink } from "./types";

function hasLabel(link: PieceLink): link is PieceLink & { label: string } {
  return link.label !== null && link.label.trim() !== "";
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export function labelForLink(link: PieceLink): string {
  if (hasLabel(link)) {
    return link.label;
  }

  return hostnameOf(link.url) ?? link.url;
}

/**
 * The hostname, shown next to a labelled link. Without a label the hostname
 * is already the visible name, so there is nothing to add.
 */
export function metadataForLink(link: PieceLink): string | null {
  return hasLabel(link) ? hostnameOf(link.url) : null;
}
