"use client";

import { useState } from "react";

import {
  createPieceNote,
  deletePieceNote,
  listPieceNotes,
  updatePieceNote,
} from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getThrownMessage } from "@/lib/getThrownMessage";
import type { PieceNoteListItem } from "@/lib/pieces/types";
import { cn } from "@/lib/utils";

const NOTE_MAX_LENGTH = 2000;

function formatNoteTimestamp(value: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function noteLengthHint(length: number): string {
  return `${length}/${NOTE_MAX_LENGTH}`;
}

function validateNoteContent(trimmed: string): string | null {
  if (trimmed === "") {
    return "Anteckning krävs";
  }
  if (trimmed.length > NOTE_MAX_LENGTH) {
    return `Anteckningen får vara högst ${NOTE_MAX_LENGTH} tecken`;
  }
  return null;
}

export type PieceNotesState = {
  notes: PieceNoteListItem[];
  isLoading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  removeNote: (noteId: string) => void;
};

/**
 * The fetched notes of one piece. Kept apart from PieceNotesPanel so the list can
 * outlive a remount of the panel (which discards drafts and open inline edits).
 */
export function usePieceNotes(
  groupSlug: string,
  pieceId: string,
  initialNotes: PieceNoteListItem[] = []
): PieceNotesState {
  const [notes, setNotes] = useState<PieceNoteListItem[]>(initialNotes);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function reload() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listPieceNotes(groupSlug, pieceId);
      setNotes(result);
    } catch (err) {
      setLoadError(getThrownMessage(err, "Kunde inte hämta anteckningar"));
    } finally {
      setIsLoading(false);
    }
  }

  function removeNote(noteId: string) {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  }

  return { notes, isLoading, loadError, reload, removeNote };
}

export function PieceNotesPanel({
  readOnly,
  groupSlug,
  pieceId,
  list,
  listClassName,
}: {
  /** Notes can still be read, but not added, edited or deleted. */
  readOnly: boolean;
  groupSlug: string;
  pieceId: string;
  list: PieceNotesState;
  listClassName?: string;
}) {
  const { notes, isLoading, loadError, reload, removeNote } = list;

  const [newContent, setNewContent] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  function startEditing(note: PieceNoteListItem) {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[note.id];
      return next;
    });
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setEditContent("");
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newContent.trim();
    const validationError = validateNoteContent(trimmed);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("pieceId", pieceId);
    formData.set("content", trimmed);

    try {
      await createPieceNote(formData);
      setNewContent("");
      await reload();
    } catch (err) {
      setCreateError(getThrownMessage(err, "Kunde inte skapa anteckning"));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveEdit(noteId: string) {
    const trimmed = editContent.trim();
    const validationError = validateNoteContent(trimmed);
    if (validationError) {
      setEditErrors((prev) => ({ ...prev, [noteId]: validationError }));
      return;
    }

    setSavingNoteId(noteId);
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[noteId];
      return next;
    });

    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("pieceNoteId", noteId);
    formData.set("content", trimmed);

    try {
      await updatePieceNote(formData);
      setEditingNoteId(null);
      setEditContent("");
      await reload();
    } catch (err) {
      setEditErrors((prev) => ({
        ...prev,
        [noteId]: getThrownMessage(err, "Kunde inte spara anteckning"),
      }));
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingNoteId(noteId);
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[noteId];
      return next;
    });

    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("pieceNoteId", noteId);

    try {
      await deletePieceNote(formData);
      removeNote(noteId);
      if (editingNoteId === noteId) {
        cancelEditing();
      }
    } catch (err) {
      setDeleteErrors((prev) => ({
        ...prev,
        [noteId]: getThrownMessage(err, "Kunde inte ta bort anteckning"),
      }));
    } finally {
      setDeletingNoteId(null);
    }
  }

  const trimmedNewContent = newContent.trim();
  const newContentTooLong = trimmedNewContent.length > NOTE_MAX_LENGTH;

  return (
    <div className="space-y-4">
      {readOnly ? null : (
        <form onSubmit={handleCreate} className="space-y-2">
          <Textarea
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            placeholder="Skriv en ny anteckning…"
            disabled={isCreating}
            aria-invalid={Boolean(createError)}
          />
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-xs text-muted-foreground",
                newContentTooLong && "text-destructive"
              )}
            >
              {noteLengthHint(trimmedNewContent.length)}
            </span>
            <Button type="submit" size="sm" disabled={isCreating}>
              {isCreating ? "Sparar..." : "Lägg till anteckning"}
            </Button>
          </div>
          {createError ? (
            <p className="text-sm text-destructive">{createError}</p>
          ) : null}
        </form>
      )}

      <div className={cn("space-y-3", listClassName)}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Hämtar anteckningar...
          </p>
        ) : loadError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void reload()}
            >
              Försök igen
            </Button>
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inga anteckningar tillagda ännu.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const editError = editErrors[note.id];
              const deleteError = deleteErrors[note.id];
              const isSaving = savingNoteId === note.id;
              const isDeleting = deletingNoteId === note.id;
              const trimmedEdit = editContent.trim();
              const editTooLong = trimmedEdit.length > NOTE_MAX_LENGTH;

              return (
                <li key={note.id} className="space-y-2 rounded border p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        disabled={isSaving}
                        aria-invalid={Boolean(editError)}
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs text-muted-foreground",
                            editTooLong && "text-destructive"
                          )}
                        >
                          {noteLengthHint(trimmedEdit.length)}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={isSaving}
                          >
                            Avbryt
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveEdit(note.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? "Sparar..." : "Spara"}
                          </Button>
                        </div>
                      </div>
                      {editError ? (
                        <p className="text-sm text-destructive">{editError}</p>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm">
                        {note.content}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {note.createdByName} · uppdaterad{" "}
                          {formatNoteTimestamp(note.updatedAt)}
                        </p>
                        {readOnly ? null : (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(note)}
                              disabled={isDeleting}
                            >
                              Redigera
                            </Button>
                            <Button
                              type="button"
                              variant={deleteError ? "destructive" : "ghost"}
                              size="sm"
                              onClick={() => handleDelete(note.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting
                                ? "Tar bort..."
                                : deleteError
                                  ? "Försök igen"
                                  : "Ta bort"}
                            </Button>
                          </div>
                        )}
                      </div>
                      {deleteError ? (
                        <p className="text-sm text-destructive">
                          {deleteError}
                        </p>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
