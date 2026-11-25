"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { updateSetListNote } from "@/app/actions/setlists";
import { useEditMode } from "@/components/EditModeContext";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RUNNING_ORDER_NOTE_CAPABILITIES } from "@/lib/edit-mode";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { cn } from "@/lib/utils";

type RunningOrderNoteEditingValue = {
  editingNoteId: string | null;
  setEditingNoteId: (noteId: string | null) => void;
};

const RunningOrderNoteEditingContext = createContext<RunningOrderNoteEditingValue | null>(null);

/**
 * Which Running-order note of a Set list is being edited. Its text and its
 * edit control sit in different cells of a row, so the state lives above them.
 */
export function RunningOrderNoteEditingProvider({ children }: { children: ReactNode }) {
  const { isEditing } = useEditMode(RUNNING_ORDER_NOTE_CAPABILITIES);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  // Leaving Edit mode drops an open editor and its draft, as it does a rename.
  if (!isEditing && editingNoteId !== null) {
    setEditingNoteId(null);
  }
  const value = useMemo(() => ({ editingNoteId, setEditingNoteId }), [editingNoteId]);
  return <RunningOrderNoteEditingContext.Provider value={value}>{children}</RunningOrderNoteEditingContext.Provider>;
}

function useRunningOrderNoteEditing() {
  const context = useContext(RunningOrderNoteEditingContext);
  if (!context) {
    throw new Error("Running-order note editing must be used within RunningOrderNoteEditingProvider");
  }
  return context;
}

/** The pencil beside a Running-order note's step actions. Render it only to a Member who may manage Running-order notes. */
export function EditRunningOrderNoteButton({ noteId, className }: { noteId: string; className?: string }) {
  const { editingNoteId, setEditingNoteId } = useRunningOrderNoteEditing();
  if (editingNoteId === noteId) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={() => setEditingNoteId(noteId)}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), className)}
      >
        <Pencil className="size-4" aria-hidden="true" />
        <span className="sr-only">Redigera anteckning</span>
      </TooltipTrigger>
      <TooltipContent side="top">Redigera</TooltipContent>
    </Tooltip>
  );
}

/**
 * A Running-order note's text, or, while it is being edited, a textarea with
 * Spara and Avbryt. Saving changes only the text; the note keeps its place.
 */
export function RunningOrderNoteText({
  groupSlug,
  noteId,
  content,
  className,
}: {
  groupSlug: string;
  noteId: string;
  content: string;
  /** Styles the text while it is not being edited. */
  className?: string;
}) {
  const { editingNoteId, setEditingNoteId } = useRunningOrderNoteEditing();

  // The saved text shows until the refresh after a save brings it in `content`.
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState(content);
  if (content !== previousContent) {
    setPreviousContent(content);
    setSavedContent(null);
  }
  const shownContent = savedContent ?? content;

  if (editingNoteId !== noteId) {
    return <p className={className}>{shownContent}</p>;
  }

  return (
    <RunningOrderNoteEditor
      groupSlug={groupSlug}
      noteId={noteId}
      content={shownContent}
      onSaved={(saved) => {
        setSavedContent(saved);
        setEditingNoteId(null);
      }}
      onCancel={() => setEditingNoteId(null)}
    />
  );
}

function RunningOrderNoteEditor({
  groupSlug,
  noteId,
  content,
  onSaved,
  onCancel,
}: {
  groupSlug: string;
  noteId: string;
  content: string;
  onSaved: (content: string) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(content);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim() === content) {
      onCancel();
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("setListNoteId", noteId);
      formData.set("content", draft);
      try {
        await updateSetListNote(formData);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte spara anteckningen"));
        return;
      }
      startTransition(() => onSaved(draft.trim()));
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-2 py-1 whitespace-normal">
      <Textarea
        ref={textareaRef}
        name="content"
        value={draft}
        disabled={isPending}
        rows={3}
        aria-label="Anteckning"
        aria-invalid={error ? true : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Spinner /> : null}
          Spara
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
