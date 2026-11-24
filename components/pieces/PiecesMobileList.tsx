"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, useState } from "react";

import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { AddPieceCreditPopover } from "@/components/pieces/AddPieceCreditPopover";
import { LetterDividerListItem } from "@/components/pieces/LetterDivider";
import { PieceNameEditor } from "@/components/pieces/PieceNameEditor";
import { RemovableCreditsList } from "@/components/pieces/RemovableCreditsList";
import { PieceFilesAndLinks } from "@/components/pieces/files-and-links/PieceFilesAndLinks";
import { toPieceFilesAndLinks } from "@/components/pieces/files-and-links/toPieceFilesAndLinks";
import { PieceNotesDialog } from "@/components/pieces/PieceNotesDialog";
import { PieceNotesList } from "@/components/pieces/PieceNotesList";
import { SetListStepActions } from "@/components/setlists/SetListStepActions";
import { MobileList, MobileListEmpty, MobileListExpandableRow } from "@/components/ui/mobile-list";
import { CREDITS_HEADING, formatCreditsLine } from "@/lib/pieces/credits";
import { pieceHref } from "@/lib/pieces/href";
import { letterDividerBefore } from "@/lib/pieces/letterGroups";
import { PieceAliasesLine } from "@/components/pieces/PieceAliasesLine";
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
 *
 * Without `setList` (Alla noter) a letter heading comes before the first piece
 * of each letter group; pass `pieces` already in the order to show.
 *
 * `emptyMessage` is the one line shown when there are no rows.
 */
export function PiecesMobileList({
  people,
  creditRoles,
  groupSlug,
  isEditing,
  emptyMessage,
  ...props
}: {
  people: Person[];
  creditRoles: string[];
  groupSlug: string;
  isEditing: boolean;
  emptyMessage: string;
} & (
  | {
      pieces: PieceWithRelations[];
      /** Per piece id, the Aliases that explain a search match its name doesn't. */
      matchingAliases?: ReadonlyMap<string, readonly string[]>;
      setList?: undefined;
    }
  | { pieces?: undefined; setList: { id: string; steps: SetListStep[] } }
)) {
  const { pieces, setList } = props;
  const matchingAliases = setList ? undefined : props.matchingAliases;
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

  const rows: (SetListStep | { kind: "piece"; id: string; piece: PieceWithRelations })[] = setList
    ? setList.steps
    : pieces.map((piece) => ({ kind: "piece", id: piece.id, piece }));
  const orderedStepIds = setList ? setList.steps.map((step) => step.id) : [];

  return (
    <MobileList>
      {rows.length === 0 ? (
        <MobileListEmpty>{emptyMessage}</MobileListEmpty>
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
                  <p className="border-l-2 pl-3 text-sm whitespace-pre-wrap text-muted-foreground italic">
                    {row.content}
                  </p>
                  {stepActions}
                </div>
              </li>
            );
          }

          const { piece } = row;
          const previous = rows[index - 1];
          const letter = setList
            ? null
            : letterDividerBefore(piece.name, previous?.kind === "piece" ? previous.piece.name : undefined);
          return (
            <Fragment key={row.id}>
              {letter ? <LetterDividerListItem letter={letter} /> : null}
              <MobileListExpandableRow
                open={openIds.has(row.id)}
                onOpenChange={(open) => setOpen(row.id, open)}
                leading={number}
                primary={
                  <>
                    <span className="font-medium">{piece.name}</span>
                    <PieceAliasesLine aliases={matchingAliases?.get(piece.id) ?? []} className="truncate" />
                  </>
                }
                // Edit mode lists the credits in its Upphovspersoner section instead.
                secondary={isEditing ? undefined : formatCreditsLine(piece.credits)}
              >
                <PieceRowDetails
                  piece={piece}
                  people={people}
                  creditRoles={creditRoles}
                  groupSlug={groupSlug}
                  isEditing={isEditing}
                  setListId={setList?.id}
                  setListPieceId={setList ? row.id : undefined}
                  stepActions={stepActions}
                />
              </MobileListExpandableRow>
            </Fragment>
          );
        })
      )}
    </MobileList>
  );
}

/**
 * What an open piece row shows: its Files, Links and Piece notes (or, in edit
 * mode, their edit sections), then the row's actions and the Detaljsida link.
 * In a Set list (`setListId`, on its Set list piece `setListPieceId`) the
 * step actions replace delete-piece.
 */
export function PieceRowDetails({
  piece,
  people,
  creditRoles,
  groupSlug,
  isEditing,
  setListId,
  setListPieceId,
  stepActions,
}: {
  piece: PieceWithRelations;
  people: Person[];
  creditRoles: string[];
  groupSlug: string;
  isEditing: boolean;
  setListId?: string;
  setListPieceId?: string;
  stepActions?: ReactNode;
}) {
  return (
    <>
      {isEditing ? (
        <PieceEditSections
          piece={piece}
          people={people}
          creditRoles={creditRoles}
          groupSlug={groupSlug}
          setListPieceId={setListPieceId}
        />
      ) : (
        <PieceMaterial piece={piece} groupSlug={groupSlug} setListPieceId={setListPieceId} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {stepActions}
        {isEditing && !setListId ? (
          <DeletePieceDialog groupSlug={groupSlug} piece={{ id: piece.id, name: piece.name }} />
        ) : null}
        <Link
          href={pieceHref(groupSlug, piece, { fromSetListId: setListId })}
          className="inline-flex min-h-11 items-center gap-1 px-1 text-sm underline underline-offset-4"
        >
          Detaljsida
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

/** Read mode: the Files and Links as 40px full-width lines, then the Piece notes. */
function PieceMaterial({
  piece,
  groupSlug,
  setListPieceId,
}: {
  piece: PieceWithRelations;
  groupSlug: string;
  setListPieceId: string | undefined;
}) {
  const notes = piece.notes.length > 0 ? <PieceNotesSection notes={piece.notes} /> : null;

  if (piece.files.length === 0 && piece.links.length === 0) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Inga filer eller länkar.</p>
        {notes}
      </>
    );
  }

  return (
    <>
      <PieceFilesAndLinks
        layout="inline"
        touch
        groupSlug={groupSlug}
        piece={{ id: piece.id, slug: piece.slug, name: piece.name }}
        filesAndLinks={toPieceFilesAndLinks(piece)}
        setListPieceId={setListPieceId}
      />
      {notes}
    </>
  );
}

/** Edit mode: the desktop table's inline edit cells, stacked under headings. */
function PieceEditSections({
  piece,
  people,
  creditRoles,
  groupSlug,
  setListPieceId,
}: {
  piece: PieceWithRelations;
  people: Person[];
  creditRoles: string[];
  groupSlug: string;
  setListPieceId: string | undefined;
}) {
  return (
    <div className="space-y-3">
      <section className="space-y-1">
        <SectionHeading>Namn</SectionHeading>
        <PieceNameEditor
          groupSlug={groupSlug}
          pieceId={piece.id}
          name={piece.name}
          renderName={(name) => <span className="min-w-0 text-sm break-words">{name}</span>}
        />
      </section>
      <section className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading>{CREDITS_HEADING}</SectionHeading>
          <AddPieceCreditPopover
            people={people}
            creditRoles={creditRoles}
            groupSlug={groupSlug}
            piece={{ id: piece.id, name: piece.name, credits: piece.credits }}
          />
        </div>
        {piece.credits.length > 0 ? (
          <RemovableCreditsList groupSlug={groupSlug} pieceId={piece.id} credits={piece.credits} />
        ) : null}
      </section>
      <section className="space-y-1">
        <SectionHeading>Filer och länkar</SectionHeading>
        <PieceFilesAndLinks
          layout="inline"
          touch
          groupSlug={groupSlug}
          piece={{ id: piece.id, slug: piece.slug, name: piece.name }}
          filesAndLinks={toPieceFilesAndLinks(piece)}
          setListPieceId={setListPieceId}
        />
      </section>
      <PieceNotesSection notes={piece.notes}>
        <PieceNotesDialog
          groupSlug={groupSlug}
          piece={{ id: piece.id, name: piece.name }}
          hasNotes={piece.notes.length > 0}
          // A touch target, like the Detaljsida link.
          triggerClassName="inline-flex min-h-11 items-center"
        />
      </PieceNotesSection>
    </div>
  );
}

/** The Piece notes under their heading, then (in edit mode) the dialog trigger. */
function PieceNotesSection({ notes, children }: { notes: PieceWithRelations["notes"]; children?: ReactNode }) {
  return (
    <section className="space-y-1">
      <SectionHeading>Anteckningar</SectionHeading>
      <PieceNotesList notes={notes} />
      {children}
    </section>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-medium text-muted-foreground uppercase">{children}</h3>;
}
