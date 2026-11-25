"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deletePieceFile } from "@/app/actions/files";
import { removeLink } from "@/app/actions/pieces";
import { hideOnSetListPiece, unhideOnSetListPiece } from "@/app/actions/setlists";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceFilePopover } from "@/components/pieces/AddPieceFilePopover";
import { AddPieceFileRow } from "@/components/pieces/AddPieceFileRow";
import { AddPieceLinkPopover } from "@/components/pieces/AddPieceLinkPopover";
import { AddPieceLinkRow } from "@/components/pieces/AddPieceLinkRow";
import { CategoryHeading } from "@/components/pieces/CategoryHeading";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { groupByCategory } from "@/lib/pieces/categories";
import { applyHidden, hiddenNotice, hiddenPlace, type SetListPieceHides } from "@/lib/setlists/hidden";
import { cn } from "@/lib/utils";

import { type EditorTarget, isBlocked, isOpen, nextEditor, type OpenEditor } from "./editor";
import { FileRow, LinkRow, type RowContext } from "./rows";
import type { PieceFilesAndLinksData } from "./toPieceFilesAndLinks";
import { useRefreshWhilePreparing } from "./useRefreshWhilePreparing";

type PieceFilesAndLinksProps = {
  groupSlug: string;
  piece: { id: string; slug: string; name: string };
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
  /**
   * The Set list piece these are shown on, if any: its Playable Files open
   * the player for it, and what it hides is left out (CONTEXT.md, "Hidden").
   */
  setListPiece?: SetListPieceHides;
};

/**
 * A Piece's Files and Links under their Categories (see Category in
 * CONTEXT.md), each group one list sorted by name. In Edit mode it offers
 * adding, renaming, replacing, editing and removing them, with one editor
 * open at a time for the Piece. Leaving or entering Edit mode closes any editor.
 *
 * On a Set list piece, what it hides is left out; in Edit mode it shows
 * dimmed instead, and each File and Link can be hidden or shown there. On a
 * Piece's page opened from the Set list piece, a notice says how many are
 * hidden and can show them, dimmed, until the page is left.
 */
export function PieceFilesAndLinks(props: PieceFilesAndLinksProps) {
  const { canEdit, isEditing } = useEditMode();
  // Remount on every toggle so switching Edit mode closes any open editor and
  // discards a half-filled add row.
  return <Body key={isEditing ? "edit" : "read"} canManage={canEdit} isEditing={isEditing} {...props} />;
}

function Body({
  canManage,
  isEditing,
  groupSlug,
  piece,
  filesAndLinks,
  layout,
  touch = false,
  setListPiece,
}: PieceFilesAndLinksProps & { canManage: boolean; isEditing: boolean }) {
  const router = useRouter();
  const [editor, setEditorState] = useState<OpenEditor>(null);
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const [togglingHidden, setTogglingHidden] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  // "Visa alla" on a Piece's page; never stored, so leaving the page resets it.
  const [revealed, setRevealed] = useState(false);
  useRefreshWhilePreparing(filesAndLinks.files, router);

  /**
   * Runs a row's server action for one File or Link (`kind:id`): marks it
   * pending in `setPending` meanwhile, clears its last error, refreshes on
   * success and keeps the error message, or `fallback`, on failure.
   */
  async function runRowAction(
    key: string,
    setPending: (update: (prev: ReadonlySet<string>) => ReadonlySet<string>) => void,
    fallback: string,
    action: (formData: FormData) => Promise<unknown>,
  ) {
    setPending((prev) => new Set(prev).add(key));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      await action(formData);
      router.refresh();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [key]: getThrownMessage(err, fallback) }));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function setHidden(kind: "file" | "link", id: string, hidden: boolean) {
    if (!setListPiece) return;
    const fallback = hidden ? "Kunde inte dölja" : "Kunde inte visa";
    void runRowAction(`${kind}:${id}`, setTogglingHidden, fallback, (formData) => {
      formData.set("setListPieceId", setListPiece.id);
      formData.set(kind === "file" ? "fileId" : "linkId", id);
      return (hidden ? hideOnSetListPiece : unhideOnSetListPiece)(formData);
    });
  }

  function remove(kind: "file" | "link", id: string) {
    const fallback = kind === "file" ? "Kunde inte ta bort fil" : "Kunde inte ta bort länk";
    void runRowAction(`${kind}:${id}`, setRemoving, fallback, (formData) => {
      formData.set(kind === "file" ? "fileId" : "linkId", id);
      return kind === "file" ? deletePieceFile(formData) : removeLink(formData);
    });
  }

  const ctx: RowContext = {
    groupSlug,
    pieceId: piece.id,
    pieceSlug: piece.slug,
    pieceName: piece.name,
    // Only a Set list's rows open the player for their Set list piece, which
    // closes back to the Set list; on a Piece's page it closes to the Piece.
    setListPieceId: layout === "inline" ? setListPiece?.id : undefined,
    layout,
    touch,
    canManage,
    isEditing,
    editor,
    setEditor: (target, opening) => setEditorState((open) => nextEditor(open, target, opening)),
    onRefresh: () => router.refresh(),
  };

  const shown = applyHidden(filesAndLinks.files, filesAndLinks.links, setListPiece, {
    showHidden: isEditing || revealed,
  });
  const groups = groupByCategory(shown.files, shown.links);
  const rowProps = (kind: "file" | "link", id: string, hidden: boolean) => ({
    ctx,
    removing: removing.has(`${kind}:${id}`),
    error: layout === "inline" ? errors[`${kind}:${id}`] : undefined,
    onRemove: () => remove(kind, id),
    hidden,
    hideToggle:
      setListPiece && isEditing
        ? {
            place: hiddenPlace(setListPiece.setListName),
            pending: togglingHidden.has(`${kind}:${id}`),
            onToggle: () => setHidden(kind, id, !hidden),
          }
        : undefined,
  });

  const list = (group: (typeof groups)[number]) => (
    <ul
      className={layout === "inline" ? cn("min-w-0 text-sm", isEditing && !touch && "space-y-2") : "space-y-2 text-sm"}
    >
      {group.entries.map((entry) =>
        entry.kind === "file" ? (
          <FileRow
            key={`file:${entry.file.id}`}
            item={entry.file}
            {...rowProps("file", entry.file.id, entry.file.hidden)}
          />
        ) : (
          <LinkRow
            key={`link:${entry.link.id}`}
            item={entry.link}
            {...rowProps("link", entry.link.id, entry.link.hidden)}
          />
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
  const setListName = setListPiece?.setListName;
  return (
    <>
      {setListName !== undefined && !isEditing && shown.hiddenCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {hiddenNotice(shown.hiddenCount, setListName)}{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => setRevealed((was) => !was)}
          >
            {revealed ? "Dölj igen" : "Visa alla"}
          </button>
        </p>
      ) : null}
      {groups.length === 0 ? (
        // Everything Hidden: the notice above already says so.
        shown.hiddenCount > 0 ? null : (
          <p className="text-sm text-muted-foreground">Inga filer eller länkar tillagda ännu.</p>
        )
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
