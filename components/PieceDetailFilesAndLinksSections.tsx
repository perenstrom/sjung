"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useEditMode } from "@/components/EditModeContext";
import { AddPieceFileRow } from "@/components/pieces/AddPieceFileRow";
import { AddPieceLinkRow } from "@/components/pieces/AddPieceLinkRow";
import { PieceDetailSectionLayout } from "@/components/pieces/PieceDetailSectionLayout";
import { PieceFilesList } from "@/components/pieces/PieceFilesList";
import { PieceLinksList } from "@/components/pieces/PieceLinksList";
import { RenamePieceFilePopover } from "@/components/pieces/RenamePieceFilePopover";
import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { groupByCategory, type CategoryGroup } from "@/lib/pieces/categories";

type PieceDetailFilesAndLinksSectionsProps = {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceFileListItem[];
  links: PieceLink[];
};

/**
 * The Piece detail page's Files and Links as one Filer och länkar section.
 * Once anything has a Category, they show under a subheading per Category
 * (see `groupByCategory`). Files come before Links in each.
 */
export function PieceDetailFilesAndLinksSections(props: PieceDetailFilesAndLinksSectionsProps) {
  const { isEditing } = useEditMode();
  // Remount on every toggle so leaving edit mode closes any open popover and
  // discards a half-filled add row.
  return <FilesAndLinksSections key={isEditing ? "edit" : "read"} readOnly={!isEditing} {...props} />;
}

function FilesAndLinksSections({
  readOnly,
  groupSlug,
  pieceId,
  pieceName,
  files,
  links,
}: PieceDetailFilesAndLinksSectionsProps & { readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const groups = groupByCategory(files, links);
  const categorized = groups.some((group) => group.heading !== null);

  function groupLists(group: CategoryGroup<PieceFileListItem, PieceLink>) {
    return (
      <>
        {group.files.length > 0 ? (
          <PieceFilesList
            groupSlug={groupSlug}
            files={group.files}
            readOnly={readOnly}
            onAggregateError={setError}
            onClearAggregateError={() => setError(null)}
            onMutationSuccess={() => router.refresh()}
            renderFileActions={(file) => (
              <RenamePieceFilePopover
                key={file.id}
                groupSlug={groupSlug}
                fileId={file.id}
                displayName={file.displayName}
                category={file.category}
                open={editingFileId === file.id}
                triggerClassName="size-7 shrink-0"
                onOpenChange={(nextOpen) => {
                  if (nextOpen) {
                    setEditingFileId(file.id);
                  } else if (editingFileId === file.id) {
                    setEditingFileId(null);
                  }
                }}
              />
            )}
          />
        ) : null}
        {group.links.length > 0 ? (
          <PieceLinksList
            groupSlug={groupSlug}
            links={group.links}
            pieceName={pieceName}
            readOnly={readOnly}
            editingLinkId={editingLinkId}
            onEditingLinkIdChange={setEditingLinkId}
          />
        ) : null}
      </>
    );
  }

  // Errors come from editing, so they show with the add rows.
  const addRows: ReactNode = readOnly ? null : (
    <>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <AddPieceFileRow groupSlug={groupSlug} pieceId={pieceId} />
      <div className="border-t pt-3">
        <AddPieceLinkRow groupSlug={groupSlug} pieceId={pieceId} />
      </div>
    </>
  );

  return (
    <PieceDetailSectionLayout title="Filer och länkar">
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga filer eller länkar tillagda ännu.</p>
      ) : categorized ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground">{group.heading}</h3>
              <div className="space-y-2">{groupLists(group)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">{groupLists(groups[0])}</div>
      )}
      {addRows === null ? null : <div className="space-y-3 border-t pt-3">{addRows}</div>}
    </PieceDetailSectionLayout>
  );
}
