"use client";

import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import { PieceCreditsList } from "@/components/pieces/PieceCreditsList";
import { PieceInlineFilesCell } from "@/components/pieces/PieceInlineFilesCell";
import { PieceInlineLinksCell } from "@/components/pieces/PieceInlineLinksCell";
import { PieceNotesDialog } from "@/components/pieces/PieceNotesDialog";
import { SetListStepActions } from "@/components/setlists/SetListStepActions";
import {
  MobileList,
  MobileListEmpty,
  MobileListExpandableRow,
} from "@/components/ui/mobile-list";
import { formatCreditsLine } from "@/lib/pieces/credits";
import { pieceHref } from "@/lib/pieces/href";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";
import type { Person } from "@/types/piece-credit-dialog";

// The running-order number. Note rows reserve the same width, so a note's
// text lines up with the piece names.
const STEP_NUMBER_CLASS = "text-muted-foreground w-6 shrink-0 font-mono text-xs";

/**
 * The pieces list below `md` (Utfällbar lista): one row per piece that opens
 * in place to reach its Files, Links and Piece notes. In edit mode an open row
 * shows the same inline edit sections as the desktop table's cells.
 *
 * Pass `setList` instead of `pieces` for a set list's running order: rows get
 * their number, Running-order notes show inline, and in edit mode an open row
 * (or a note) gets the step reorder/remove actions instead of delete-piece.
 */
export function PiecesMobileList({
  people,
  groupSlug,
  isEditing,
  ...props
}: {
  people: Person[];
  groupSlug: string;
  isEditing: boolean;
} & (
  | { pieces: PieceWithRelations[]; setList?: undefined }
  | { pieces?: undefined; setList: { id: string; steps: SetListStep[] } }
)) {
  const { pieces, setList } = props;
  // Kept by row id (the step id in a set list, where a piece can appear
  // twice), so rows stay open across router.refresh().
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  function setOpen(rowId: string, open: boolean) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }

  const rows: (SetListStep | { kind: "piece"; id: string; piece: PieceWithRelations })[] =
    setList ? setList.steps : pieces.map((piece) => ({ kind: "piece", id: piece.id, piece }));
  const orderedStepIds = setList ? setList.steps.map((step) => step.id) : [];

  return (
    <MobileList>
      {rows.length === 0 ? (
        <MobileListEmpty>
          {setList ? "Inga steg i repertoaren ännu." : "Inga noter tillagda ännu."}
        </MobileListEmpty>
      ) : (
        rows.map((row, index) => {
          const number = setList ? <span className={STEP_NUMBER_CLASS}>{index + 1}</span> : null;
          const stepActions =
            setList && isEditing ? (
              <div className="flex items-center">
                <SetListStepActions
                  step={row}
                  stepIndex={index}
                  orderedStepIds={orderedStepIds}
                  groupSlug={groupSlug}
                  setListId={setList.id}
                />
              </div>
            ) : null;

          if (row.kind === "note") {
            return (
              <li key={row.id} className="flex items-baseline gap-2 px-4 py-3">
                {number}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-muted-foreground border-l-2 pl-3 text-sm whitespace-pre-wrap italic">
                    {row.content}
                  </p>
                  {stepActions}
                </div>
              </li>
            );
          }

          const { piece } = row;
          return (
            <MobileListExpandableRow
              key={row.id}
              open={openIds.has(row.id)}
              onOpenChange={(open) => setOpen(row.id, open)}
              leading={number}
              primary={<span className="font-medium">{piece.name}</span>}
              // Edit mode lists the credits in its Medverkande section instead.
              secondary={isEditing ? undefined : formatCreditsLine(piece.credits)}
              trailing={<FileAndLinkCounts piece={piece} />}
            >
              {isEditing ? (
                <PieceEditSections piece={piece} people={people} groupSlug={groupSlug} />
              ) : (
                <PieceMaterial piece={piece} groupSlug={groupSlug} />
              )}
              <div className="flex flex-wrap items-center gap-2">
                {stepActions}
                {isEditing ? (
                  <EditPieceDialog
                    people={people}
                    groupSlug={groupSlug}
                    piece={{ id: piece.id, name: piece.name, credits: piece.credits }}
                  />
                ) : null}
                <PieceNotesDialog
                  readOnly={!isEditing}
                  groupSlug={groupSlug}
                  piece={{ id: piece.id, name: piece.name }}
                />
                {isEditing && !setList ? (
                  <DeletePieceDialog
                    groupSlug={groupSlug}
                    piece={{ id: piece.id, name: piece.name }}
                  />
                ) : null}
                <Link
                  href={pieceHref(groupSlug, piece.id, { fromSetListId: setList?.id })}
                  className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4"
                >
                  Öppna stycket
                </Link>
              </div>
            </MobileListExpandableRow>
          );
        })
      )}
    </MobileList>
  );
}

function FileAndLinkCounts({ piece }: { piece: PieceWithRelations }) {
  return (
    <>
      {piece.files.length > 0 ? (
        <span className="inline-flex items-center gap-0.5">
          <FileText className="size-3.5" aria-hidden="true" />
          {piece.files.length}
          <span className="sr-only">{piece.files.length === 1 ? " fil" : " filer"}</span>
        </span>
      ) : null}
      {piece.links.length > 0 ? (
        <span className="inline-flex items-center gap-0.5">
          <ExternalLink className="size-3.5" aria-hidden="true" />
          {piece.links.length}
          <span className="sr-only">{piece.links.length === 1 ? " länk" : " länkar"}</span>
        </span>
      ) : null}
    </>
  );
}

/** Read mode: Files, then Links, as 40px full-width lines. */
function PieceMaterial({
  piece,
  groupSlug,
}: {
  piece: PieceWithRelations;
  groupSlug: string;
}) {
  if (piece.files.length === 0 && piece.links.length === 0) {
    return <p className="text-muted-foreground text-sm">Inga filer eller länkar.</p>;
  }

  return (
    <div>
      <PieceInlineFilesCell
        readOnly
        touch
        groupSlug={groupSlug}
        pieceId={piece.id}
        pieceName={piece.name}
        files={toInlineFiles(piece)}
      />
      <PieceInlineLinksCell
        readOnly
        touch
        groupSlug={groupSlug}
        pieceId={piece.id}
        pieceName={piece.name}
        links={toInlineLinks(piece)}
      />
    </div>
  );
}

/** Edit mode: the desktop table's inline edit cells, stacked under headings. */
function PieceEditSections({
  piece,
  people,
  groupSlug,
}: {
  piece: PieceWithRelations;
  people: Person[];
  groupSlug: string;
}) {
  return (
    <div className="space-y-3">
      <section className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading>Medverkande</SectionHeading>
          <AddPieceCreditPopover
            people={people}
            groupSlug={groupSlug}
            piece={{ id: piece.id, name: piece.name }}
          />
        </div>
        {piece.credits.length > 0 ? <PieceCreditsList credits={piece.credits} /> : null}
      </section>
      <section className="space-y-1">
        <SectionHeading>Filer</SectionHeading>
        <PieceInlineFilesCell
          touch
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          files={toInlineFiles(piece)}
        />
      </section>
      <section className="space-y-1">
        <SectionHeading>Länkar</SectionHeading>
        <PieceInlineLinksCell
          touch
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          links={toInlineLinks(piece)}
        />
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-medium uppercase">{children}</h3>
  );
}

function toInlineFiles(piece: PieceWithRelations) {
  return piece.files.map((file) => ({
    id: file.id,
    displayName: file.displayName,
    size: file.size,
  }));
}

function toInlineLinks(piece: PieceWithRelations) {
  return piece.links.map((link) => ({ id: link.id, url: link.url, label: link.label }));
}
