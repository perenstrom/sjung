import type { PieceLink } from "./types";

/** What a Link's name and metadata are made from. */
type NamedLink = Pick<PieceLink, "url" | "label">;

function hasLabel(link: NamedLink): link is NamedLink & { label: string } {
  return link.label !== null && link.label.trim() !== "";
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export function labelForLink(link: NamedLink): string {
  if (hasLabel(link)) {
    return link.label;
  }

  return hostnameOf(link.url) ?? link.url;
}

/**
 * The hostname, shown next to a labelled link. Without a label the hostname
 * is already the visible name, so there is nothing to add.
 */
export function metadataForLink(link: NamedLink): string | null {
  return hasLabel(link) ? hostnameOf(link.url) : null;
}
