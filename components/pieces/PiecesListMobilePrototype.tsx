"use client";

// PROTOTYPE — throwaway (PER-365). Lives only on prototype/pieces-list-mobile;
// never merge to main. Mobile (< md) variants of the pieces list, switched via
// `?variant=` by PrototypeSwitcher. Desktop keeps the real table.

import { ChevronDown, ChevronRight, ExternalLink, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { createPieceFileDownloadUrl } from "@/app/actions/files";
import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import { labelForLink } from "@/components/pieces/linkLabel";
import { PieceCreditsList } from "@/components/pieces/PieceCreditsList";
import { PieceInlineFilesCell } from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import { PieceNotesDialog } from "@/components/pieces/PieceNotesDialog";
import { SetListStepActions } from "@/components/setlists/SetListStepActions";
import { groupCreditsByPerson } from "@/lib/pieces/credits";
import type { PieceWithRelations } from "@/lib/pieces/types";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

export const PIECES_LIST_VARIANTS = [
  { key: "A", name: "Kort" },
  { key: "B", name: "Smal tabell" },
  { key: "C", name: "Scrollad tabell" },
  { key: "D", name: "Utfällbar lista" },
];

type Row =
  | { kind: "piece"; id: string; piece: PieceWithRelations }
  | { kind: "note"; id: string; content: string };

export type MobileListProps = {
  rows: Row[];
  isEditing: boolean;
  groupSlug: string;
  people: Person[];
  setListId?: string;
  orderedStepIds: string[];
  emptyMessage: string;
};

// ---------- shared bits ----------

function creditsLine(piece: PieceWithRelations): string {
  return groupCreditsByPerson(piece.credits)
    .map((person) => `${person.name} (${person.roles.join(", ")})`)
    .join(" · ");
}

function FileChip({ groupSlug, file, asRow = false }: { groupSlug: string; file: { id: string; displayName: string }; asRow?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (file.id.startsWith("mock-")) return;
        setBusy(true);
        try {
          const formData = new FormData();
          formData.set("groupSlug", groupSlug);
          formData.set("fileId", file.id);
          const { downloadUrl } = await createPieceFileDownloadUrl(formData);
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 text-sm text-primary disabled:opacity-50",
        asRow ? "min-h-10 w-full text-left" : "min-h-11 rounded-full border bg-background px-3"
      )}
    >
      <FileText className={cn("shrink-0 text-muted-foreground", asRow ? "size-3.5" : "size-4")} aria-hidden />
      <span className="truncate">{busy ? "Hämtar..." : file.displayName}</span>
    </button>
  );
}

function LinkChip({ link, asRow = false }: { link: { id: string; url: string; label: string | null }; asRow?: boolean }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 text-sm text-primary",
        asRow ? "min-h-10 w-full" : "min-h-11 rounded-full border bg-background px-3"
      )}
    >
      <ExternalLink className={cn("shrink-0 text-muted-foreground", asRow ? "size-3.5" : "size-4")} aria-hidden />
      <span className="truncate">{labelForLink(link)}</span>
    </a>
  );
}

function EditSections({ piece, groupSlug, people }: { piece: PieceWithRelations; groupSlug: string; people: Person[] }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase text-muted-foreground">Medverkande</span>
          <AddPieceCreditPopover people={people} groupSlug={groupSlug} piece={{ id: piece.id, name: piece.name }} />
        </div>
        {piece.credits.length > 0 ? <PieceCreditsList credits={piece.credits} /> : null}
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">Länkar</span>
        <PieceInlineLinksCell
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          links={piece.links.map((l) => ({ id: l.id, url: l.url, label: l.label }))}
        />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">Filer</span>
        <PieceInlineFilesCell
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          files={piece.files.map((f) => ({ id: f.id, displayName: f.displayName, size: f.size }))}
        />
      </div>
    </div>
  );
}

function RowActions({
  row,
  index,
  props,
}: {
  row: Row;
  index: number;
  props: MobileListProps;
}) {
  const { isEditing, groupSlug, people, setListId, orderedStepIds } = props;
  const piece = row.kind === "piece" ? row.piece : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {setListId && isEditing ? (
        <SetListStepActions
          step={row}
          stepIndex={index}
          groupSlug={groupSlug}
          setListId={setListId}
          orderedStepIds={orderedStepIds}
        />
      ) : null}
      {piece && isEditing ? (
        <EditPieceDialog
          people={people}
          groupSlug={groupSlug}
          piece={{ id: piece.id, name: piece.name, credits: piece.credits }}
        />
      ) : null}
      {piece ? (
        <PieceNotesDialog readOnly={!isEditing} groupSlug={groupSlug} piece={{ id: piece.id, name: piece.name }} />
      ) : null}
      {piece && !setListId && isEditing ? (
        <DeletePieceDialog groupSlug={groupSlug} piece={{ id: piece.id, name: piece.name }} />
      ) : null}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="py-6 text-sm text-muted-foreground">{message}</p>;
}

function NoteBlock({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
      {content}
    </div>
  );
}

// ---------- A: cards ----------

export function VariantCards(props: MobileListProps) {
  const { rows, groupSlug, isEditing, people, setListId } = props;
  if (rows.length === 0) return <Empty message={props.emptyMessage} />;
  return (
    <ol className="-mx-4 divide-y border-y">
      {rows.map((row, index) => (
        <li key={row.id}>
          {row.kind === "note" ? (
            <div className="space-y-2 bg-muted/30 px-4 py-3">
              <NoteBlock content={row.content} />
              {isEditing ? <RowActions row={row} index={index} props={props} /> : null}
            </div>
          ) : (
            <div className="space-y-3 bg-card p-4">
              <div className="flex items-start gap-3">
                {setListId ? (
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">
                    {index + 1}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/${groupSlug}/pieces/${row.piece.id}`}
                    className="text-base font-semibold underline-offset-4 hover:underline"
                  >
                    {row.piece.name}
                  </Link>
                  {!isEditing && row.piece.credits.length > 0 ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{creditsLine(row.piece)}</p>
                  ) : null}
                </div>
              </div>
              {isEditing ? (
                <EditSections piece={row.piece} groupSlug={groupSlug} people={people} />
              ) : row.piece.links.length + row.piece.files.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {row.piece.files.map((file) => (
                    <FileChip key={file.id} groupSlug={groupSlug} file={file} />
                  ))}
                  {row.piece.links.map((link) => (
                    <LinkChip key={link.id} link={link} />
                  ))}
                </div>
              ) : null}
              <RowActions row={row} index={index} props={props} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

// ---------- B: narrow table, extra columns hidden, drill into detail ----------

export function VariantNarrowTable(props: MobileListProps) {
  const { rows, groupSlug, isEditing, setListId } = props;
  if (rows.length === 0) return <Empty message={props.emptyMessage} />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          {setListId ? <th className="w-8 py-2 font-medium">#</th> : null}
          <th className="py-2 font-medium">Namn</th>
          <th className="w-0 py-2 text-right font-medium whitespace-nowrap">Material</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id} className="border-b last:border-0 align-top">
            {setListId ? <td className="py-3 font-mono text-xs">{index + 1}</td> : null}
            {row.kind === "note" ? (
              <td colSpan={2} className="py-3">
                <NoteBlock content={row.content} />
                {isEditing ? (
                  <div className="mt-2">
                    <RowActions row={row} index={index} props={props} />
                  </div>
                ) : null}
              </td>
            ) : (
              <>
                <td className="py-3 pr-2">
                  <Link
                    href={`/app/${groupSlug}/pieces/${row.piece.id}`}
                    className="flex min-h-11 flex-col justify-center"
                  >
                    <span className="font-medium underline underline-offset-4">{row.piece.name}</span>
                    {row.piece.credits.length > 0 ? (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{creditsLine(row.piece)}</span>
                    ) : null}
                  </Link>
                  {isEditing ? (
                    <div className="mt-2">
                      <RowActions row={row} index={index} props={props} />
                    </div>
                  ) : null}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/app/${groupSlug}/pieces/${row.piece.id}`}
                    className="inline-flex min-h-11 items-center gap-2 text-muted-foreground"
                    aria-label={`Öppna ${row.piece.name}`}
                  >
                    {row.piece.files.length > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        <FileText className="size-3.5" /> {row.piece.files.length}
                      </span>
                    ) : null}
                    {row.piece.links.length > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Link2 className="size-3.5" /> {row.piece.links.length}
                      </span>
                    ) : null}
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- D: expandable list ----------

export function VariantAccordion(props: MobileListProps) {
  const { rows, groupSlug, isEditing, people, setListId } = props;
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  if (rows.length === 0) return <Empty message={props.emptyMessage} />;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="-mx-4 divide-y border-y">
      {rows.map((row, index) => {
        if (row.kind === "note") {
          return (
            <li key={row.id} className={cn("space-y-2 py-3 pr-4", setListId ? "pl-13" : "pl-4")}>
              <NoteBlock content={row.content} />
              {isEditing ? <RowActions row={row} index={index} props={props} /> : null}
            </li>
          );
        }
        const open = openIds.has(row.id);
        const piece = row.piece;
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => toggle(row.id)}
              aria-expanded={open}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
            >
              {setListId ? (
                <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className={cn("block font-medium", !open && "truncate")}>{piece.name}</span>
                {piece.credits.length > 0 ? (
                  <span className={cn("block text-xs text-muted-foreground", !open && "truncate")}>
                    {creditsLine(piece)}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {piece.files.length > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <FileText className="size-3.5" /> {piece.files.length}
                  </span>
                ) : null}
                {piece.links.length > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Link2 className="size-3.5" /> {piece.links.length}
                  </span>
                ) : null}
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
              </span>
            </button>
            {open ? (
              <div className={cn("space-y-3 pr-4 pb-4", setListId ? "pl-13" : "pl-4")}>
                {isEditing ? (
                  <EditSections piece={piece} groupSlug={groupSlug} people={people} />
                ) : piece.files.length + piece.links.length > 0 ? (
                  <ul>
                    {piece.files.map((file) => (
                      <li key={file.id}>
                        <FileChip groupSlug={groupSlug} file={file} asRow />
                      </li>
                    ))}
                    {piece.links.map((link) => (
                      <li key={link.id}>
                        <LinkChip link={link} asRow />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Inga filer eller länkar.</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <RowActions row={row} index={index} props={props} />
                  <Link
                    href={`/app/${groupSlug}/pieces/${piece.id}`}
                    className="inline-flex min-h-8 items-center text-sm underline underline-offset-4"
                  >
                    Öppna stycket
                  </Link>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// ---------- mock data (prototype only) ----------

type MockPiece = {
  name: string;
  credits: [string, string][];
  files: [string, number][];
  links: [string, string | null][];
};

const MOCK_PIECES: MockPiece[] = [
  {
    name: "Uti vår hage",
    credits: [["Hugo Alfvén", "Arrangör"], ["Folkvisa från Värend", "Kompositör"]],
    files: [["Uti vår hage – partitur.pdf", 412_000], ["Uti vår hage – sopran stämfil.mp3", 3_400_000], ["Uti vår hage – alt stämfil.mp3", 3_300_000]],
    links: [["https://www.youtube.com/watch?v=abc123", "Inspelning, Orphei Drängar"], ["https://imslp.org/wiki/Uti_v%C3%A5r_hage", null]],
  },
  {
    name: "Even When He Is Silent (Text from a wall in Cologne, 1945)",
    credits: [["Kim André Arnesen", "Kompositör"], ["Okänd", "Textförfattare"]],
    files: [["Even When He Is Silent.pdf", 980_000]],
    links: [["https://open.spotify.com/track/xyz", "Spotify"]],
  },
  {
    name: "Det är en ros utsprungen",
    credits: [
      ["Michael Praetorius", "Kompositör"],
      ["Michael Praetorius", "Arrangör"],
      ["Jan Sandström", "Arrangör"],
      ["Johan Olof Wallin", "Översättare"],
    ],
    files: [["Det är en ros – Sandström.pdf", 1_200_000], ["Det är en ros – tenor.mp3", 2_900_000], ["Det är en ros – bas.mp3", 2_950_000], ["Det är en ros – tutti.mp3", 3_100_000]],
    links: [],
  },
  {
    name: "Bred dina vida vingar",
    credits: [["Lina Sandell", "Textförfattare"]],
    files: [],
    links: [["https://www.youtube.com/watch?v=def456", "Övningsvideo"], ["https://www.youtube.com/watch?v=ghi789", "Konsert 2024"], ["https://example.com/noter/bred-dina-vida-vingar", null]],
  },
  {
    name: "Sommarpsalm",
    credits: [["Waldemar Åhlén", "Kompositör"], ["Carl David af Wirsén", "Textförfattare"]],
    files: [["Sommarpsalm.pdf", 300_000]],
    links: [["https://www.youtube.com/watch?v=jkl012", "Referensinspelning"]],
  },
  {
    name: "Ave Maria",
    credits: [],
    files: [],
    links: [],
  },
];

export function mockRows(withNote: boolean): Row[] {
  const rows: Row[] = MOCK_PIECES.map((mock, i) => ({
    kind: "piece",
    id: `mock-${i}`,
    piece: {
      id: `mock-${i}`,
      name: mock.name,
      credits: mock.credits.map(([name, role], j) => ({
        personId: `mock-person-${name}`,
        pieceId: `mock-${i}`,
        role,
        person: { name },
        id: `mock-credit-${i}-${j}`,
      })),
      files: mock.files.map(([displayName, size], j) => ({ id: `mock-file-${i}-${j}`, displayName, size })),
      links: mock.links.map(([url, label], j) => ({ id: `mock-link-${i}-${j}`, url, label })),
    } as unknown as PieceWithRelations,
  }));
  if (withNote) {
    rows.splice(3, 0, { kind: "note", id: "mock-note", content: "Paus – 15 min. Byt till svarta mappar." });
  }
  return rows;
}
