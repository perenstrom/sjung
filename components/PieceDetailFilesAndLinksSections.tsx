"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useEditMode } from "@/components/EditModeContext";
import { PieceDetailFilesSection } from "@/components/PieceDetailFilesSection";
import { PieceDetailLinksSection } from "@/components/PieceDetailLinksSection";
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
 * The Piece detail page's Files and Links: a Filer and a Länkar section, or,
 * once anything has a Category, one section per Category instead.
 */
export function PieceDetailFilesAndLinksSections(props: PieceDetailFilesAndLinksSectionsProps) {
  const { isEditing } = useEditMode();
  const groups = groupByCategory(props.files, props.links);

  if (groups === null) {
    return (
      <>
        <PieceDetailFilesSection {...props} />
        <PieceDetailLinksSection {...props} />
      </>
    );
  }

  // Remount on every toggle so leaving edit mode closes any open popover and
  // discards a half-filled add row.
  return (
    <CategorySections
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      groups={groups}
      {...props}
    />
  );
}

function CategorySections({
  readOnly,
  groups,
  groupSlug,
  pieceId,
  pieceName,
}: PieceDetailFilesAndLinksSectionsProps & {
  readOnly: boolean;
  groups: CategoryGroup<PieceFileListItem, PieceLink>[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  return (
    <>
      {groups.map((group) => (
        <PieceDetailSectionLayout key={group.heading} title={group.heading}>
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
        </PieceDetailSectionLayout>
      ))}

      {/* Errors come from editing, so they show with the add rows. */}
      {readOnly ? null : (
        <PieceDetailSectionLayout title="Lägg till">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AddPieceFileRow groupSlug={groupSlug} pieceId={pieceId} />
          <div className="border-t pt-3">
            <AddPieceLinkRow groupSlug={groupSlug} pieceId={pieceId} />
          </div>
        </PieceDetailSectionLayout>
      )}
    </>
  );
}
