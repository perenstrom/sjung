"use client";

import { Download, ExternalLink, FileText, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, type ReactNode, useState, useTransition } from "react";

import { retryPieceFileConversion } from "@/app/actions/files";

import { EditPieceLinkPopover } from "@/components/pieces/EditPieceLinkPopover";
import { noteOpenedFromList } from "@/components/player/closePlayer";
import { metadataForFile } from "@/components/pieces/fileMetadata";
import { labelForLink, metadataForLink } from "@/lib/pieces/linkLabel";
import { splitForMiddleTruncation } from "@/components/pieces/middleTruncation";
import { RenamePieceFilePopover } from "@/components/pieces/RenamePieceFilePopover";
import { ReplacePieceFilePopover } from "@/components/pieces/ReplacePieceFilePopover";
import type { PieceFileListItem, PieceLink } from "@/components/pieces/types";
import { TruncatedTooltip } from "@/components/TruncatedTooltip";
import { Button } from "@/components/ui/button";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { fileDownloadHref, playerHref } from "@/lib/pieces/href";
import { cn } from "@/lib/utils";

import { type EditorTarget, isBlocked, isOpen, type OpenEditor } from "./editor";

/** What a row needs from its `PieceFilesAndLinks`; private to this folder. */
export type RowContext = {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  setListPieceId: string | undefined;
  layout: "detail" | "inline";
  touch: boolean;
  /** Whether the viewer has Manage content, in Edit mode or not. */
  canManage: boolean;
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
      <InlineRow touch={ctx.touch} error={error} below={<FileConversionRetry ctx={ctx} file={file} />}>
        <FileIcon file={file} />
        <TruncatedTooltip content={file.displayName}>
          <FileOpenLink
            ctx={ctx}
            file={file}
            dimmed={removing}
            className={cn("flex min-w-0 flex-1 overflow-hidden", ctx.touch && "leading-10")}
          >
            <MiddleTruncatedText text={file.displayName} />
          </FileOpenLink>
        </TruncatedTooltip>
        <FilePlaybackNote file={file} />
        {opensPlayer(file) ? <FileDownloadButton ctx={ctx} file={file} dimmed={removing} /> : null}
        {actions}
      </InlineRow>
    );
  }

  return (
    <li className="flex min-h-7 flex-wrap items-center gap-x-2">
      {/* The icon and name never wrap apart; the name truncates instead. */}
      <span className="inline-flex max-w-full min-w-0 items-center gap-2">
        <FileIcon file={file} />
        <TruncatedTooltip content={file.displayName}>
          <FileOpenLink ctx={ctx} file={file} dimmed={removing} className="block min-w-0 truncate font-medium">
            {file.displayName}
          </FileOpenLink>
        </TruncatedTooltip>
      </span>
      {/* Metadata and actions wrap onto the next line together. */}
      <span className="inline-flex items-center gap-2">
        <FilePlaybackNote file={file} />
        <span className="text-xs text-muted-foreground">{metadataForFile(file)}</span>
        {opensPlayer(file) ? <FileDownloadButton ctx={ctx} file={file} dimmed={removing} /> : null}
        {actions === null ? null : <span className="inline-flex items-center">{actions}</span>}
      </span>
      <FileConversionRetry ctx={ctx} file={file} />
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
      <RemoveButton label={`Ta bort länk ${label}`} disabled={removing || isBlocked(ctx.editor)} onClick={onRemove} />
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
              ctx.touch && "leading-10",
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
function InlineRow({
  touch,
  error,
  below,
  children,
}: {
  touch: boolean;
  error: string | undefined;
  /** Shown on its own line under the row, if it renders anything. */
  below?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="space-y-1">
      <div className={cn("flex min-w-0 items-center gap-1", touch ? "min-h-10" : "min-h-7")}>{children}</div>
      {below}
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

function FileIcon({ file }: { file: PieceFileListItem }) {
  // A File that couldn't be prepared shows as an ordinary File (PER-479).
  const Icon = opensPlayer(file) || file.playback === "preparing" ? Play : FileText;
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}

/** Says a MuseScore File is still being prepared for the player (ADR-0009). */
function FilePlaybackNote({ file }: { file: PieceFileListItem }) {
  return file.playback === "preparing" ? (
    <span className="shrink-0 text-xs text-muted-foreground">Förbereds…</span>
  ) : null;
}

/**
 * Lets someone with Manage content prepare a MuseScore File for the player
 * again (ADR-0009): one that failed, saying so and suggesting MusicXML
 * instead, or in Edit mode one still being prepared, which a restart may have
 * left that way. A singer sees neither: to them a failed File is an ordinary one.
 */
function FileConversionRetry({ ctx, file }: { ctx: RowContext; file: PieceFileListItem }) {
  const [retrying, startRetrying] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Edit mode is only ever on for someone with Manage content.
  const showFailure = file.playback === "failed" && ctx.canManage;
  if (!showFailure && !(file.playback === "preparing" && ctx.isEditing)) return null;

  function retry() {
    setError(null);
    startRetrying(async () => {
      try {
        const formData = new FormData();
        formData.set("groupSlug", ctx.groupSlug);
        formData.set("fileId", file.id);
        await retryPieceFileConversion(formData);
        ctx.onRefresh();
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte försöka igen"));
      }
    });
  }

  const button = (
    <button
      type="button"
      className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
      disabled={retrying}
      onClick={retry}
    >
      Försök igen
    </button>
  );
  return (
    <span className={cn("text-xs text-muted-foreground", ctx.layout === "inline" ? "block" : "basis-full")}>
      {showFailure ? <>Kunde inte förberedas. {button} eller ladda upp den som MusicXML i stället.</> : button}
      {error ? <span className="block text-destructive">{error}</span> : null}
    </span>
  );
}

/** Whether the File's name opens the player, with a separate download button, rather than downloading it. */
function opensPlayer(file: PieceFileListItem): boolean {
  return file.playback === "ready";
}

const DIMMED = "pointer-events-none opacity-50";

/**
 * Opens a File: a Playable File ready to play in the player (see CONTEXT.md),
 * any other through `FileDownloadLink`. While the File is being removed it dims and
 * stops opening.
 */
function FileOpenLink({
  ctx,
  file,
  dimmed,
  className,
  children,
}: {
  ctx: RowContext;
  file: PieceFileListItem;
  dimmed: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn("text-left text-primary underline-offset-4 hover:underline", dimmed && DIMMED, className);
  if (!opensPlayer(file)) {
    return (
      <FileDownloadLink ctx={ctx} file={file} dimmed={dimmed} className={classes}>
        {children}
      </FileDownloadLink>
    );
  }
  return (
    <Link
      href={playerHref(ctx.groupSlug, ctx.pieceId, file.id, { fromSetListPieceId: ctx.setListPieceId })}
      onClick={noteOpenedFromList}
      aria-disabled={dimmed || undefined}
      className={classes}
    >
      {children}
    </Link>
  );
}

/** Downloads a Playable File, whose name opens the player instead. */
function FileDownloadButton({ ctx, file, dimmed }: { ctx: RowContext; file: PieceFileListItem; dimmed: boolean }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={cn("size-7 shrink-0 text-muted-foreground", dimmed && DIMMED)}
    >
      <FileDownloadLink ctx={ctx} file={file} dimmed={dimmed} aria-label={`Ladda ner ${file.displayName}`}>
        <Download className="size-3.5" aria-hidden />
      </FileDownloadLink>
    </Button>
  );
}

/**
 * Opens a File in a new tab through its download route. A plain link, so the
 * tap itself opens the tab: iOS Safari blocks one opened by script after an
 * await (PER-415).
 */
function FileDownloadLink({
  ctx,
  file,
  dimmed,
  ...props
}: { ctx: RowContext; file: PieceFileListItem; dimmed: boolean } & ComponentProps<"a">) {
  return (
    <a
      {...props}
      href={fileDownloadHref(ctx.groupSlug, file.id)}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={dimmed || undefined}
    />
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
