"use client";

import { ExternalLink, FileText, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { EditPieceLinkPopover } from "@/components/pieces/EditPieceLinkPopover";
import { metadataForFile } from "@/components/pieces/fileMetadata";
import { labelForLink, metadataForLink } from "@/components/pieces/linkLabel";
import { splitForMiddleTruncation } from "@/components/pieces/middleTruncation";
import { RenamePieceFilePopover } from "@/components/pieces/RenamePieceFilePopover";
import { ReplacePieceFilePopover } from "@/components/pieces/ReplacePieceFilePopover";
import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { TruncatedTooltip } from "@/components/TruncatedTooltip";
import { Button } from "@/components/ui/button";
import { fileDownloadHref } from "@/lib/pieces/href";
import { cn } from "@/lib/utils";

import { type EditorTarget, isBlocked, isOpen, type OpenEditor } from "./editor";

/** What a row needs from its `PieceFilesAndLinks`; private to this folder. */
export type RowContext = {
  groupSlug: string;
  pieceName: string;
  layout: "detail" | "inline";
  touch: boolean;
  isEditing: boolean;
  editor: OpenEditor;
  setEditor: (target: EditorTarget, opening: boolean) => void;
  onRefresh: () => void;
};

type RowProps<T> = {
  ctx: RowContext;
  item: T;
  removing: boolean;
  /** Shown under the row inline; on the Piece page the errors gather by the add rows. */
  error: string | undefined;
  onRemove: () => void;
};

export function FileRow({ ctx, item: file, removing, error, onRemove }: RowProps<PieceFileListItem>) {
  const rename: EditorTarget = { kind: "renameFile", id: file.id };
  const replace: EditorTarget = { kind: "replaceFile", id: file.id };

  const actions = ctx.isEditing ? (
    <>
      <RenamePieceFilePopover
        groupSlug={ctx.groupSlug}
        fileId={file.id}
        displayName={file.displayName}
        category={file.category}
        pieceName={ctx.pieceName}
        open={isOpen(ctx.editor, rename)}
        disabled={removing || isBlocked(ctx.editor, rename)}
        triggerClassName="size-7 shrink-0"
        onOpenChange={(opening) => ctx.setEditor(rename, opening)}
      />
      <ReplacePieceFilePopover
        groupSlug={ctx.groupSlug}
        fileId={file.id}
        displayName={file.displayName}
        pieceName={ctx.pieceName}
        open={isOpen(ctx.editor, replace)}
        disabled={removing || isBlocked(ctx.editor, replace)}
        triggerClassName="size-7 shrink-0"
        onOpenChange={(opening) => ctx.setEditor(replace, opening)}
        onReplaceSuccess={ctx.onRefresh}
      />
      <RemoveButton
        label={`Ta bort fil ${file.displayName}`}
        disabled={removing || isBlocked(ctx.editor)}
        onClick={onRemove}
      />
    </>
  ) : null;

  if (ctx.layout === "inline") {
    return (
      <InlineRow touch={ctx.touch} error={error}>
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <TruncatedTooltip content={file.displayName}>
          <FileDownloadLink
            groupSlug={ctx.groupSlug}
            fileId={file.id}
            dimmed={removing}
            className={cn("flex min-w-0 flex-1 overflow-hidden", ctx.touch && "leading-10")}
          >
            <MiddleTruncatedText text={file.displayName} />
          </FileDownloadLink>
        </TruncatedTooltip>
        {actions}
      </InlineRow>
    );
  }

  return (
    <li className="flex min-h-7 flex-wrap items-center gap-x-2">
      {/* The icon and name never wrap apart; the name truncates instead. */}
      <span className="inline-flex max-w-full min-w-0 items-center gap-2">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <TruncatedTooltip content={file.displayName}>
          <FileDownloadLink
            groupSlug={ctx.groupSlug}
            fileId={file.id}
            dimmed={removing}
            className="block min-w-0 truncate font-medium"
          >
            {file.displayName}
          </FileDownloadLink>
        </TruncatedTooltip>
      </span>
      {/* Metadata and actions wrap onto the next line together. */}
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{metadataForFile(file)}</span>
        {actions === null ? null : <span className="inline-flex items-center">{actions}</span>}
      </span>
    </li>
  );
}

export function LinkRow({ ctx, item: link, removing, error, onRemove }: RowProps<PieceLink>) {
  const edit: EditorTarget = { kind: "editLink", id: link.id };
  const label = labelForLink(link);

  const actions = ctx.isEditing ? (
    <>
      <EditPieceLinkPopover
        groupSlug={ctx.groupSlug}
        link={link}
        pieceName={ctx.pieceName}
        open={isOpen(ctx.editor, edit)}
        disabled={removing || isBlocked(ctx.editor, edit)}
        triggerClassName="size-7 shrink-0"
        onOpenChange={(opening) => ctx.setEditor(edit, opening)}
      />
      <RemoveButton
        label={`Ta bort länk ${label}`}
        disabled={removing || isBlocked(ctx.editor)}
        onClick={onRemove}
      />
    </>
  ) : null;

  if (ctx.layout === "inline") {
    return (
      <InlineRow touch={ctx.touch} error={error}>
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <TruncatedTooltip content={label}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline",
              ctx.touch && "leading-10"
            )}
          >
            {label}
            <span className="sr-only">, öppnas i ny flik</span>
          </a>
        </TruncatedTooltip>
        {actions}
      </InlineRow>
    );
  }

  const metadata = metadataForLink(link);
  return (
    <li className="flex min-h-7 flex-wrap items-center gap-x-2">
      {/* The icon and label never wrap apart; the label truncates instead. */}
      <span className="inline-flex max-w-full min-w-0 items-center gap-2">
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <TruncatedTooltip content={label}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate font-medium text-primary underline-offset-4 hover:underline"
          >
            {label}
            <span className="sr-only">, öppnas i ny flik</span>
          </a>
        </TruncatedTooltip>
      </span>
      {/* Metadata and actions wrap onto the next line together. */}
      {metadata === null && actions === null ? null : (
        <span className="inline-flex items-center gap-2">
          {metadata === null ? null : <span className="text-xs text-muted-foreground">{metadata}</span>}
          {actions === null ? null : <span className="inline-flex items-center">{actions}</span>}
        </span>
      )}
    </li>
  );
}

/** A row in a table cell or touch list: 28px, or 40px for touch, so the first lines up with its neighbours. */
function InlineRow({ touch, error, children }: { touch: boolean; error: string | undefined; children: ReactNode }) {
  return (
    <li className="space-y-1">
      <div className={cn("flex min-w-0 items-center gap-1", touch ? "min-h-10" : "min-h-7")}>{children}</div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </li>
  );
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost-destructive"
      size="icon"
      className="size-7 shrink-0"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </Button>
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
        {start.replace(/ $/, " ")}
      </span>
      {end ? <span className="shrink-0 whitespace-nowrap">{end.replace(/^ /, " ")}</span> : null}
    </>
  );
}
