"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deletePieceFile } from "@/app/actions/files";
import { removeLink } from "@/app/actions/pieces";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceFilePopover } from "@/components/pieces/AddPieceFilePopover";
import { AddPieceFileRow } from "@/components/pieces/AddPieceFileRow";
import { AddPieceLinkPopover } from "@/components/pieces/AddPieceLinkPopover";
import { AddPieceLinkRow } from "@/components/pieces/AddPieceLinkRow";
import { CategoryHeading } from "@/components/pieces/CategoryHeading";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { groupByCategory } from "@/lib/pieces/categories";
import { cn } from "@/lib/utils";

import { type EditorTarget, isBlocked, isOpen, nextEditor, type OpenEditor } from "./editor";
import { FileRow, LinkRow, type RowContext } from "./rows";
import type { PieceFilesAndLinksData } from "./toPieceFilesAndLinks";
import { useRefreshWhilePreparing } from "./useRefreshWhilePreparing";

type PieceFilesAndLinksProps = {
  groupSlug: string;
  piece: { id: string; name: string };
  /** From `toPieceFilesAndLinks`. */
  filesAndLinks: PieceFilesAndLinksData;
  /**
   * `detail`: the Piece page's Filer och länkar section, with metadata, an
   * empty state and add rows. `inline`: a pieces list cell, compact, with add
   * buttons and nothing at all when empty.
   */
  layout: "detail" | "inline";
  /** Inline only: 40px lines whose names fill the line, for touch lists. */
  touch?: boolean;
  /** The Set list piece these are shown on, if any: its Playable Files open the player for it. */
  setListPieceId?: string;
};

/**
 * A Piece's Files and Links under their Categories (see Category in
 * CONTEXT.md), each group one list sorted by name. In Edit mode it offers
 * adding, renaming, replacing, editing and removing them, with one editor
 * open at a time for the Piece. Leaving or entering Edit mode closes any editor.
 */
export function PieceFilesAndLinks(props: PieceFilesAndLinksProps) {
  const { isEditing } = useEditMode();
  // Remount on every toggle so switching Edit mode closes any open editor and
  // discards a half-filled add row.
  return <Body key={isEditing ? "edit" : "read"} isEditing={isEditing} {...props} />;
}

function Body({
  isEditing,
  groupSlug,
  piece,
  filesAndLinks,
  layout,
  touch = false,
  setListPieceId,
}: PieceFilesAndLinksProps & { isEditing: boolean }) {
  const router = useRouter();
  const [editor, setEditorState] = useState<OpenEditor>(null);
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  useRefreshWhilePreparing(filesAndLinks.files, router);

  async function remove(kind: "file" | "link", id: string) {
    const key = `${kind}:${id}`;
    setRemoving((prev) => new Set(prev).add(key));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      if (kind === "file") {
        formData.set("fileId", id);
        await deletePieceFile(formData);
      } else {
        formData.set("linkId", id);
        await removeLink(formData);
      }
      router.refresh();
    } catch (err) {
      const fallback = kind === "file" ? "Kunde inte ta bort fil" : "Kunde inte ta bort länk";
      setErrors((prev) => ({ ...prev, [key]: getThrownMessage(err, fallback) }));
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  const ctx: RowContext = {
    groupSlug,
    pieceId: piece.id,
    pieceName: piece.name,
    setListPieceId,
    layout,
    touch,
    isEditing,
    editor,
    setEditor: (target, opening) => setEditorState((open) => nextEditor(open, target, opening)),
    onRefresh: () => router.refresh(),
  };

  const groups = groupByCategory(filesAndLinks.files, filesAndLinks.links);
  const rowProps = (kind: "file" | "link", id: string) => ({
    ctx,
    removing: removing.has(`${kind}:${id}`),
    error: layout === "inline" ? errors[`${kind}:${id}`] : undefined,
    onRemove: () => void remove(kind, id),
  });

  const list = (group: (typeof groups)[number]) => (
    <ul
      className={layout === "inline" ? cn("min-w-0 text-sm", isEditing && !touch && "space-y-2") : "space-y-2 text-sm"}
    >
      {group.entries.map((entry) =>
        entry.kind === "file" ? (
          <FileRow key={`file:${entry.file.id}`} item={entry.file} {...rowProps("file", entry.file.id)} />
        ) : (
          <LinkRow key={`link:${entry.link.id}`} item={entry.link} {...rowProps("link", entry.link.id)} />
        ),
      )}
    </ul>
  );

  if (layout === "inline") {
    const editorProps = (target: EditorTarget) => ({
      groupSlug,
      pieceId: piece.id,
      pieceName: piece.name,
      open: isOpen(editor, target),
      disabled: isBlocked(editor, target),
      onOpenChange: (opening: boolean) => ctx.setEditor(target, opening),
    });

    return (
      // The item rows are taller than their text, which already spaces a
      // heading from its first item; the wider gap between groups ties each
      // heading to its own items rather than the group above.
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.heading ?? ""}>
            {group.heading === null ? null : <CategoryHeading>{group.heading}</CategoryHeading>}
            {list(group)}
          </div>
        ))}
        {isEditing ? (
          // The add buttons sit at the end of their lines, Files first.
          <div className="flex flex-col gap-1">
            <div className="flex justify-end">
              <AddPieceFilePopover {...editorProps({ kind: "addFile" })} />
            </div>
            <div className="flex justify-end">
              <AddPieceLinkPopover {...editorProps({ kind: "addLink" })} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const categorized = groups.some((group) => group.heading !== null);
  return (
    <>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga filer eller länkar tillagda ännu.</p>
      ) : categorized ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <CategoryHeading as="h3">{group.heading}</CategoryHeading>
              {list(group)}
            </div>
          ))}
        </div>
      ) : (
        list(groups[0])
      )}
      {isEditing ? (
        // Errors come from editing, so they show with the add rows.
        <div className="space-y-3 border-t pt-3">
          {Object.entries(errors).map(([key, message]) => (
            <p key={key} className="text-sm text-destructive">
              {message}
            </p>
          ))}
          <AddPieceFileRow groupSlug={groupSlug} pieceId={piece.id} />
          <div className="border-t pt-3">
            <AddPieceLinkRow groupSlug={groupSlug} pieceId={piece.id} />
          </div>
        </div>
      ) : null}
    </>
  );
}
