// PROTOTYPE (PER-458, PER-463): how a singer opens the player. On a Piece page
// the stub Playable Files are listed like Files, and clicking one opens the
// player (download moves to a small button). There is no "Öva" button and no
// Set list play buttons (PER-461): a singer always opens a specific File.

import { Download, Play } from "lucide-react";
import Link from "next/link";

import { FIXTURES, FORMAT_LABEL } from "./fixtures";

function playerHref(groupSlug: string, pieceId: string, file: string) {
  const params = new URLSearchParams({ file });
  return `/app/${groupSlug}/pieces/${pieceId}/prototype-player?${params}`;
}

export function PiecePlayableFilesPrototype({ groupSlug, pieceId }: { groupSlug: string; pieceId: string }) {
  return (
    <section className="space-y-2 rounded-lg border border-dashed border-amber-500 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          Övningsfiler <span className="text-xs font-normal text-amber-700">(prototyp)</span>
        </h2>
      </div>
      <ul className="divide-y text-sm">
        {FIXTURES.map((f) => (
          <li key={f.key} className="flex items-center gap-2">
            <Link
              href={playerHref(groupSlug, pieceId, f.key)}
              className="group flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded hover:bg-muted/60"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Play className="size-3.5 translate-x-px" />
              </span>
              <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{FORMAT_LABEL[f.format]}</span>
            </Link>
            <button type="button" aria-label={`Ladda ner ${f.fileName}`} className="rounded p-2 text-muted-foreground">
              <Download className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
