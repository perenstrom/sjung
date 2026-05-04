import { ExternalLink } from "lucide-react";

import { labelForLink } from "@/components/PieceLinksDialog/linkLabel";
import type { PieceLink } from "@/components/PieceLinksDialog/types";

export type PieceDetailLink = Pick<PieceLink, "id" | "url" | "label">;

function linkTitle(link: Pick<PieceLink, "url" | "label">): string {
  const trimmed = link.label?.trim();
  if (trimmed && trimmed !== link.url) {
    return `${link.url} (${trimmed})`;
  }
  return link.url;
}

export function PieceDetailLinksList({ links }: { links: PieceDetailLink[] }) {
  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground">Inga länkar tillagda ännu.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {links.map((link) => (
        <li key={link.id} className="flex min-w-0 items-center gap-2">
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={linkTitle(link)}
            className="flex min-w-0 flex-1 items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            <span className="min-w-0 flex-1 truncate">{labelForLink(link)}</span>
            <span className="sr-only">, öppnas i ny flik</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
