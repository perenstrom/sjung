"use client";

import { useEffect, useState } from "react";

import {
  createPieceFileDownloadUrl,
  deletePieceFile,
} from "@/app/actions/files";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/formatFileSize";
import { getThrownMessage } from "@/lib/getThrownMessage";

export type PieceFileListItem = {
  id: string;
  displayName: string;
  size: number;
  createdAt?: Date | string;
};

function formatUploadedAt(value: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PieceFilesList({
  groupSlug,
  files,
  showUploadedAt,
  dialogOpen,
  onAggregateError,
  onClearAggregateError,
  onMutationSuccess,
}: {
  groupSlug: string;
  files: PieceFileListItem[];
  showUploadedAt: boolean;
  /** When `false` (e.g. dialog closed), clears row spinners and delete errors */
  dialogOpen?: boolean;
  onAggregateError: (message: string) => void;
  onClearAggregateError: () => void;
  onMutationSuccess?: () => void;
}) {
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dialogOpen === false) {
      setDeleteErrors({});
      setDownloadingFileId(null);
      setDeletingFileId(null);
    }
  }, [dialogOpen]);

  async function handleDownload(fileId: string) {
    setDownloadingFileId(fileId);
    onClearAggregateError();

    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("fileId", fileId);
      const { downloadUrl } = await createPieceFileDownloadUrl(formData);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      onAggregateError(getThrownMessage(err, "Kunde inte ladda ner fil"));
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId);
    onClearAggregateError();
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });

    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("fileId", fileId);
      await deletePieceFile(formData);
      onMutationSuccess?.();
    } catch (err) {
      const message = getThrownMessage(err, "Kunde inte ta bort fil");
      setDeleteErrors((prev) => ({ ...prev, [fileId]: message }));
    } finally {
      setDeletingFileId(null);
    }
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Inga filer uppladdade ännu.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {files.map((file) => {
        const deleteError = deleteErrors[file.id];
        return (
          <li key={file.id} className="space-y-2 rounded border p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {file.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                  {showUploadedAt && file.createdAt != null ? (
                    <>
                      {" · "}
                      {formatUploadedAt(file.createdAt)}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file.id)}
                  disabled={
                    downloadingFileId === file.id || deletingFileId === file.id
                  }
                >
                  {downloadingFileId === file.id ? "Hämtar..." : "Ladda ner"}
                </Button>
                <Button
                  type="button"
                  variant={deleteError ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={deletingFileId === file.id}
                >
                  {deletingFileId === file.id
                    ? "Tar bort..."
                    : deleteError
                      ? "Försök igen"
                      : "Ta bort"}
                </Button>
              </div>
            </div>
            {deleteError ? (
              <p className="text-xs text-destructive">{deleteError}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
