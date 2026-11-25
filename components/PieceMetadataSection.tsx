"use client";

import { useRouter } from "next/navigation";

import { useEditMode } from "@/components/EditModeContext";
import { EditModeToggle } from "@/components/EditModeToggle";
import { PieceAliasesEditor } from "@/components/pieces/PieceAliasesEditor";
import { PieceAliasesLine } from "@/components/pieces/PieceAliasesLine";
import { PieceNameEditor } from "@/components/pieces/PieceNameEditor";
import { pieceHref } from "@/lib/pieces/href";
import type { PieceAliasItem } from "@/lib/pieces/types";

type PieceMetadataSectionProps = {
  groupSlug: string;
  pieceId: string;
  initialName: string;
  /** The Piece's Aliases, in the order they were added. */
  aliases: readonly PieceAliasItem[];
  /** The Set list piece the page was opened from, kept when a rename moves the page. */
  fromSetListPieceId: string | undefined;
};

const renderHeading = (name: string) => <h1 className="min-w-0 text-2xl font-semibold break-words">{name}</h1>;

export function PieceMetadataSection({
  groupSlug,
  pieceId,
  initialName,
  aliases,
  fromSetListPieceId,
}: PieceMetadataSectionProps) {
  const { isEditing } = useEditMode();
  const router = useRouter();

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        {isEditing ? (
          // Unmounted when edit mode ends, which discards an unsaved name.
          <PieceNameEditor
            groupSlug={groupSlug}
            pieceId={pieceId}
            name={initialName}
            renderName={renderHeading}
            className="flex-1"
            inputClassName="h-10 max-w-md text-lg font-semibold md:pointer-fine:text-lg"
            // The page moves with the Piece's Slug, and the old address no longer works.
            onRenamed={(slug) => router.replace(pieceHref(groupSlug, { slug }, { fromSetListPieceId }))}
          />
        ) : (
          <div className="min-w-0 flex-1">{renderHeading(initialName)}</div>
        )}
        <EditModeToggle />
      </div>
      {isEditing ? (
        <PieceAliasesEditor groupSlug={groupSlug} pieceId={pieceId} aliases={aliases} />
      ) : (
        <PieceAliasesLine aliases={aliases.map((alias) => alias.name)} className="break-words" />
      )}
    </section>
  );
}
