"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <PieceFilesList
        groupSlug={groupSlug}
        files={files}
        showUploadedAt
        emptyStateHint="Använd Länkar ovan för att ladda upp filer."
        onAggregateError={setError}
        onClearAggregateError={() => setError(null)}
        onMutationSuccess={() => router.refresh()}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
