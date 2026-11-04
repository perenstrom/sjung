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

function FileChip({ groupSlug, file }: { groupSlug: string; file: { id: string; displayName: string } }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
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
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border bg-background px-3 text-sm text-primary disabled:opacity-50"
    >
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{busy ? "Hämtar..." : file.displayName}</span>
    </button>
  );
}

function LinkChip({ link }: { link: { id: string; url: string; label: string | null } }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border bg-background px-3 text-sm text-primary"
    >
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
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
    <ol className="space-y-3">
      {rows.map((row, index) => (
        <li key={row.id}>
          {row.kind === "note" ? (
            <div className="space-y-2 px-1 py-1">
              <NoteBlock content={row.content} />
              {isEditing ? <RowActions row={row} index={index} props={props} /> : null}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
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
    <ul className="divide-y border-y">
      {rows.map((row, index) => {
        if (row.kind === "note") {
          return (
            <li key={row.id} className="space-y-2 py-3 pl-9">
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
              className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
                {setListId ? index + 1 : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{piece.name}</span>
                {piece.credits.length > 0 ? (
                  <span className="block truncate text-xs text-muted-foreground">{creditsLine(piece)}</span>
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
              <div className="space-y-3 pb-4 pl-9">
                {isEditing ? (
                  <EditSections piece={piece} groupSlug={groupSlug} people={people} />
                ) : piece.files.length + piece.links.length > 0 ? (
                  <div className="flex flex-col items-start gap-2">
                    {piece.files.map((file) => (
                      <FileChip key={file.id} groupSlug={groupSlug} file={file} />
                    ))}
                    {piece.links.map((link) => (
                      <LinkChip key={link.id} link={link} />
                    ))}
                  </div>
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
