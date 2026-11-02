"use client";

/**
 * PROTOTYPE (PER-351) — throwaway. Four ways to make Piece notes visible in the
 * pieces list, switchable via `?variant=A|B|C|D` on any page that renders
 * PiecesTable (Noter, Set list detail). Read mode only; edit mode keeps the
 * existing Anteckningar dialog in Åtgärder.
 */
import { StickyNote } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PieceWithRelations } from "@/lib/pieces/types";
import { cn } from "@/lib/utils";

export const NOTE_VARIANTS = [
  { key: "A", name: "Under namnet" },
  { key: "B", name: "Egen kolumn" },
  { key: "C", name: "Helbreddsrad" },
  { key: "D", name: "Ikon + förhandsvisning" },
] as const;

export type NoteVariant = (typeof NOTE_VARIANTS)[number]["key"];

export type ProtoNote = { id: string; content: string; author: string; updatedAt: Date };

const SAMPLE_NOTES = [
  "Altarna andas i takt 12, inte före.",
  "Sopraner: håll tillbaka i första refrängen, crescendo först i sista.",
  "Vi sjunger andra versen på svenska, tredje på engelska. Kolla att alla har rätt utgåva — gamla kopian saknar takt 40–48.",
  "Ton från piano, ingen stämgaffel.",
  "Tenor 1 tar den höga stämman i codan om vi är fler än fyra.",
  "Långsammare tempo än inspelningen, ca 72 bpm.",
];

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Real notes if the piece has any, otherwise 0–3 fake ones (deterministic per piece). */
export function notesFor(piece: PieceWithRelations): ProtoNote[] {
  if (piece.notes.length > 0) {
    return piece.notes.map((note) => ({
      id: note.id,
      content: note.content,
      author: note.createdBy.name,
      updatedAt: note.updatedAt,
    }));
  }
  const h = hash(piece.id);
  const count = [0, 1, 0, 2, 3, 1][h % 6];
  return Array.from({ length: count }, (_, i) => ({
    id: `${piece.id}-fake-${i}`,
    content: SAMPLE_NOTES[(h + i * 7) % SAMPLE_NOTES.length],
    author: ["Anna", "Erik", "Maja"][(h + i) % 3],
    updatedAt: new Date(Date.UTC(2026, 9, 1 + ((h + i) % 28))),
  }));
}

const FAKE_PIECE_NAMES = [
  "Vårsång",
  "Den blomstertid nu kommer",
  "Ave verum corpus",
  "Uti vår hage",
  "Shenandoah",
  "Sommarpsalm",
  "Kristallen den fina",
  "Locus iste",
];

/** Pads a short list with fake pieces (marked "(fejk)") so density can be judged. */
export function padWithFakePieces(pieces: PieceWithRelations[]): PieceWithRelations[] {
  if (pieces.length === 0 || pieces.length >= 8) return pieces;
  const template = pieces[0];
  const fakes = FAKE_PIECE_NAMES.slice(0, 10 - pieces.length).map((name, i) => ({
    ...template,
    id: `fake-piece-${i}`,
    name: `${name} (fejk)`,
    credits: i % 3 === 0 ? [] : template.credits.slice(0, 1 + (i % 2)),
    links: i % 2 === 0 ? [] : template.links,
    files: [],
    notes: [],
  }));
  return [...pieces, ...fakes];
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(value);
}

/** A: notes as muted lines under the piece name, newest two, clamped. */
export function NotesUnderName({ notes }: { notes: ProtoNote[] }) {
  const [expanded, setExpanded] = useState(false);
  if (notes.length === 0) return null;
  const shown = expanded ? notes : notes.slice(0, 2);
  return (
    <div className="mt-1 min-w-[16rem] max-w-md space-y-1">
      {shown.map((note) => (
        <p key={note.id} className="flex gap-1.5 text-xs text-muted-foreground">
          <StickyNote className="mt-0.5 size-3 shrink-0" />
          <span className={cn("whitespace-pre-wrap", !expanded && "line-clamp-2")}>
            {note.content}
          </span>
        </p>
      ))}
      {notes.length > 2 ? (
        <button
          type="button"
          className="text-xs underline text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Visa färre" : `+${notes.length - 2} till`}
        </button>
      ) : null}
    </div>
  );
}

/** B: an Anteckningar column, list like Länkar/Filer. */
export function NotesColumnCell({ notes }: { notes: ProtoNote[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="min-w-[14rem] max-w-xs space-y-1.5">
      {notes.map((note) => (
        <li key={note.id} className="text-sm leading-snug">
          <span className="line-clamp-3 whitespace-pre-wrap">{note.content}</span>
        </li>
      ))}
    </ul>
  );
}

/** C: full-width row under the piece, full text, author and date. */
export function NotesSubRow({ notes }: { notes: ProtoNote[] }) {
  return (
    <div className="space-y-1.5 border-l-2 border-amber-400 bg-amber-50/60 py-1.5 pl-3 dark:bg-amber-950/20">
      {notes.map((note) => (
        <div key={note.id} className="text-sm">
          <span className="whitespace-pre-wrap">{note.content}</span>{" "}
          <span className="text-xs text-muted-foreground">
            — {note.author}, {formatDate(note.updatedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** D: compact icon + count next to the name; hover or click shows the notes. */
export function NotesIndicator({ pieceName, notes }: { pieceName: string; notes: ProtoNote[] }) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          aria-label={`${notes.length} anteckningar`}
        >
          <StickyNote className="size-3" />
          {notes.length}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2" align="start">
        <p className="text-sm font-medium">Anteckningar för {pieceName}</p>
        {notes.map((note) => (
          <div key={note.id} className="space-y-0.5 border-t pt-2 text-sm">
            <p className="whitespace-pre-wrap">{note.content}</p>
            <p className="text-xs text-muted-foreground">
              {note.author} · {formatDate(note.updatedAt)}
            </p>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
