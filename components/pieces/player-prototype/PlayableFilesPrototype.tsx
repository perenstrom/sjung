// PROTOTYPE (PER-458): how a singer opens the player. On a Piece page the stub
// Playable Files are listed like Files, and tapping one opens the player
// (download moves to a small button). A Set list gets a play button per Piece.

import { Download, Play } from "lucide-react";
import Link from "next/link";

import { FIXTURES, FORMAT_LABEL } from "./fixtures";

function playerHref(groupSlug: string, pieceId: string, file: string, setListId?: string) {
  const params = new URLSearchParams({ file });
  if (setListId) params.set("setlist", setListId);
  return `/app/${groupSlug}/pieces/${pieceId}/prototype-player?${params}`;
}

export function PiecePlayableFilesPrototype({ groupSlug, pieceId }: { groupSlug: string; pieceId: string }) {
  return (
    <section className="space-y-2 rounded-lg border border-dashed border-amber-500 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          Övningsfiler <span className="text-xs font-normal text-amber-700">(prototyp)</span>
        </h2>
        <Link
          href={playerHref(groupSlug, pieceId, "staffan")}
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          <Play className="size-4" /> Öva
        </Link>
      </div>
      <ul className="divide-y text-sm">
        {FIXTURES.map((f) => (
          <li key={f.key} className="flex items-center gap-2">
            <Link href={playerHref(groupSlug, pieceId, f.key)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
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

export function SetListPlayPrototype({
  groupSlug,
  setListId,
  pieces,
}: {
  groupSlug: string;
  setListId: string;
  pieces: { id: string; name: string }[];
}) {
  if (pieces.length === 0) return null;
  return (
    <section className="space-y-2 rounded-lg border border-dashed border-amber-500 p-3">
      <h2 className="text-sm font-medium">
        Öva på Set listans stycken <span className="text-xs font-normal text-amber-700">(prototyp)</span>
      </h2>
      <ol className="divide-y text-sm">
        {pieces.map((p, i) => (
          <li key={p.id}>
            <Link
              href={playerHref(groupSlug, p.id, "julklockorna", setListId)}
              className="flex min-h-11 items-center gap-2"
            >
              <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Play className="size-4 translate-x-px" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
