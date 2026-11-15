"use client";

import { useEditMode } from "@/components/EditModeContext";
import { EditModeToggle } from "@/components/EditModeToggle";
import { PieceNameEditor } from "@/components/pieces/PieceNameEditor";

type PieceMetadataSectionProps = {
  groupSlug: string;
  pieceId: string;
  initialName: string;
};

const renderHeading = (name: string) => (
  <h1 className="min-w-0 text-2xl font-semibold break-words">{name}</h1>
);

export function PieceMetadataSection({ groupSlug, pieceId, initialName }: PieceMetadataSectionProps) {
  const { isEditing } = useEditMode();

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
          />
        ) : (
          <div className="min-w-0 flex-1">{renderHeading(initialName)}</div>
        )}
        <EditModeToggle />
      </div>
    </section>
  );
}
