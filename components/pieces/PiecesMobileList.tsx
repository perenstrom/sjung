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
import {
  MobileList,
  MobileListEmpty,
  MobileListExpandableRow,
} from "@/components/ui/mobile-list";
import { formatCreditsLine } from "@/lib/pieces/credits";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { Person } from "@/types/piece-credit-dialog";

/**
 * The pieces list below `md` (Utfällbar lista): one row per piece that opens
 * in place to reach its Files, Links and Piece notes. In edit mode an open row
 * shows the same inline edit sections as the desktop table's cells.
 */
export function PiecesMobileList({
  pieces,
  people,
  groupSlug,
  isEditing,
}: {
  pieces: PieceWithRelations[];
  people: Person[];
  groupSlug: string;
  isEditing: boolean;
}) {
  // Kept by piece id, so rows stay open across router.refresh().
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  function setOpen(pieceId: string, open: boolean) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(pieceId);
      else next.delete(pieceId);
      return next;
    });
  }

  return (
    <MobileList>
      {pieces.length === 0 ? (
        <MobileListEmpty>Inga noter tillagda ännu.</MobileListEmpty>
      ) : (
        pieces.map((piece) => (
          <MobileListExpandableRow
            key={piece.id}
            open={openIds.has(piece.id)}
            onOpenChange={(open) => setOpen(piece.id, open)}
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
              {isEditing ? (
                <DeletePieceDialog
                  groupSlug={groupSlug}
                  piece={{ id: piece.id, name: piece.name }}
                />
              ) : null}
              <Link
                href={`/app/${groupSlug}/pieces/${piece.id}`}
                className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4"
              >
                Öppna stycket
              </Link>
            </div>
          </MobileListExpandableRow>
        ))
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
        <SectionHeading>Länkar</SectionHeading>
        <PieceInlineLinksCell
          touch
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          links={toInlineLinks(piece)}
        />
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
