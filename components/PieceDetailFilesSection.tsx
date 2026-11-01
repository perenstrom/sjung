"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useEditMode } from "@/components/EditModeContext";
import {
  PieceFilesList,
  type PieceFileListItem,
} from "@/components/PieceLinksDialog/PieceFilesList";

export function PieceDetailFilesSection({
  groupSlug,
  files,
}: {
  groupSlug: string;
  files: PieceFileListItem[];
}) {
  const router = useRouter();
  const { isEditing } = useEditMode();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <PieceFilesList
        groupSlug={groupSlug}
        files={files}
        showUploadedAt
        readOnly={!isEditing}
        onAggregateError={setError}
        onClearAggregateError={() => setError(null)}
        onMutationSuccess={() => router.refresh()}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
