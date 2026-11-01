"use client";

import { FileText, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  createPieceFileDownloadUrl,
  deletePieceFile,
} from "@/app/actions/files";
import { metadataForFile } from "@/components/pieces/fileMetadata";
import { ReplacePieceFilePopover } from "@/components/pieces/ReplacePieceFilePopover";
import type { PieceFileListItem } from "@/components/pieces/types";
import { TruncatedTooltip } from "@/components/TruncatedTooltip";
import { Button } from "@/components/ui/button";
import { getThrownMessage } from "@/lib/getThrownMessage";

export function PieceFilesList({
  groupSlug,
  files,
  readOnly = false,
  onAggregateError,
  onClearAggregateError,
  onMutationSuccess,
  disabled = false,
  renderFileActions,
  replacingFileId,
  onReplacingFileIdChange,
  compact = false,
}: {
  groupSlug: string;
  files: PieceFileListItem[];
  /** Keep only downloading; hide rename, replace and delete. */
  readOnly?: boolean;
  /** Download errors, and remove errors in the non-compact list. */
  onAggregateError: (message: string) => void;
  onClearAggregateError: () => void;
  onMutationSuccess?: () => void;
  disabled?: boolean;
  renderFileActions?: (file: PieceFileListItem) => ReactNode;
  replacingFileId?: string | null;
  onReplacingFileIdChange?: (fileId: string | null) => void;
  compact?: boolean;
}) {
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

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
      if (compact) {
        setDeleteErrors((prev) => ({ ...prev, [fileId]: message }));
      } else {
        onAggregateError(message);
      }
    } finally {
      setDeletingFileId(null);
    }
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Inga filer uppladdade ännu.</p>
    );
  }

  function replacePopoverProps(file: PieceFileListItem) {
    return {
      groupSlug,
      fileId: file.id,
      displayName: file.displayName,
      open:
        replacingFileId !== undefined
          ? replacingFileId === file.id
          : undefined,
      disabled: deletingFileId === file.id || disabled,
      onOpenChange: onReplacingFileIdChange
        ? (nextOpen: boolean) =>
            onReplacingFileIdChange(nextOpen ? file.id : null)
        : undefined,
      onReplaceSuccess: onMutationSuccess,
    };
  }

  if (compact) {
    return (
      <ul className="space-y-2 text-sm">
        {files.map((file) => {
          const deleteError = deleteErrors[file.id];
          return (
            <li key={file.id} className="space-y-1">
              <div className="flex min-w-0 items-center gap-1">
                <FileText
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => handleDownload(file.id)}
                  disabled={
                    downloadingFileId === file.id ||
                    deletingFileId === file.id ||
                    disabled
                  }
                  className="min-w-0 flex-1 truncate text-left text-primary underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {downloadingFileId === file.id
                    ? "Hämtar..."
                    : file.displayName}
                </button>
                {readOnly ? null : (
                  <>
                    {renderFileActions?.(file)}
                    <ReplacePieceFilePopover
                      {...replacePopoverProps(file)}
                      triggerClassName="size-7 shrink-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deletingFileId === file.id || disabled}
                      aria-label={`Ta bort fil ${file.displayName}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </>
                )}
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

  return (
    <ul className="space-y-2 text-sm">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex min-h-7 flex-wrap items-center gap-x-2"
        >
          {/* The icon and name never wrap apart; the name truncates instead. */}
          <span className="inline-flex max-w-full min-w-0 items-center gap-2">
            <FileText
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <TruncatedTooltip content={file.displayName}>
              <button
                type="button"
                onClick={() => handleDownload(file.id)}
                disabled={
                  downloadingFileId === file.id || deletingFileId === file.id
                }
                className="min-w-0 truncate text-left font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                {downloadingFileId === file.id ? "Hämtar..." : file.displayName}
              </button>
            </TruncatedTooltip>
          </span>
          {/* Metadata and actions wrap onto the next line together. */}
          <span className="inline-flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {metadataForFile(file)}
            </span>
            {readOnly ? null : (
              <span className="inline-flex items-center">
                {renderFileActions?.(file)}
                <ReplacePieceFilePopover
                  {...replacePopoverProps(file)}
                  triggerClassName="size-7 shrink-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={deletingFileId === file.id}
                  aria-label={`Ta bort fil ${file.displayName}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
