"use client";

import { FileText, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { deletePieceFile } from "@/app/actions/files";
import { metadataForFile } from "@/components/pieces/fileMetadata";
import { splitForMiddleTruncation } from "@/components/pieces/middleTruncation";
import { ReplacePieceFilePopover } from "@/components/pieces/ReplacePieceFilePopover";
import type { PieceFileListItem } from "@/components/pieces/types";
import { TruncatedTooltip } from "@/components/TruncatedTooltip";
import { fileDownloadHref } from "@/lib/pieces/href";
import { Button } from "@/components/ui/button";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { cn } from "@/lib/utils";

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
  touch = false,
}: {
  groupSlug: string;
  files: PieceFileListItem[];
  /** Keep only downloading; hide rename, replace and delete. */
  readOnly?: boolean;
  /** Remove errors in the non-compact list. */
  onAggregateError: (message: string) => void;
  onClearAggregateError: () => void;
  onMutationSuccess?: () => void;
  disabled?: boolean;
  renderFileActions?: (file: PieceFileListItem) => ReactNode;
  replacingFileId?: string | null;
  onReplacingFileIdChange?: (fileId: string | null) => void;
  compact?: boolean;
  /** Compact only: 40px lines whose name fills the line, for touch lists. */
  touch?: boolean;
}) {
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

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
    // Compact lists sit in piece table cells, where an empty cell stays blank.
    if (compact) {
      return null;
    }

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
      // Rows are 28px in read-only and edit mode so the first row lines up
      // with neighbouring table cells; read-only drops the gap to keep its
      // pitch.
      <ul className={cn("text-sm", !readOnly && !touch && "space-y-2")}>
        {files.map((file) => {
          const deleteError = deleteErrors[file.id];
          return (
            <li key={file.id} className="space-y-1">
              <div
                className={cn(
                  "flex min-w-0 items-center gap-1",
                  touch ? "min-h-10" : "min-h-7"
                )}
              >
                <FileText
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <TruncatedTooltip content={file.displayName}>
                  <FileDownloadLink
                    groupSlug={groupSlug}
                    fileId={file.id}
                    dimmed={deletingFileId === file.id || disabled}
                    className={cn(
                      "flex min-w-0 flex-1 overflow-hidden",
                      touch && "leading-10"
                    )}
                  >
                    <MiddleTruncatedText text={file.displayName} />
                  </FileDownloadLink>
                </TruncatedTooltip>
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
                      className="size-7 shrink-0 text-destructive hover:text-destructive"
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
              <FileDownloadLink
                groupSlug={groupSlug}
                fileId={file.id}
                dimmed={deletingFileId === file.id}
                className="block min-w-0 truncate font-medium"
              >
                {file.displayName}
              </FileDownloadLink>
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
                  className="size-7 shrink-0 text-destructive hover:text-destructive"
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

/**
 * Opens a File in a new tab through its download route. A plain link, so the
 * tap itself opens the tab: iOS Safari blocks one opened by script after an
 * await (PER-415). While the File is being removed it dims and stops opening.
 */
function FileDownloadLink({
  groupSlug,
  fileId,
  dimmed,
  className,
  children,
}: {
  groupSlug: string;
  fileId: string;
  dimmed: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={fileDownloadHref(groupSlug, fileId)}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={dimmed || undefined}
      className={cn(
        "text-left text-primary underline-offset-4 hover:underline",
        dimmed && "pointer-events-none opacity-50",
        className
      )}
    >
      {children}
    </a>
  );
}

/**
 * Cuts a name in the middle, so its end (e.g. a file extension) stays
 * visible. The start truncates and is what `TruncatedTooltip` measures.
 */
function MiddleTruncatedText({ text }: { text: string }) {
  const { start, end } = splitForMiddleTruncation(text);
  // A space at the split would collapse at the edge of its span, so it
  // becomes a non-breaking one.
  return (
    <>
      <span data-truncates className="min-w-0 truncate">
        {start.replace(/ $/, "\u00a0")}
      </span>
      {end ? (
        <span className="shrink-0 whitespace-nowrap">
          {end.replace(/^ /, "\u00a0")}
        </span>
      ) : null}
    </>
  );
}
