"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState, useTransition } from "react";

import { updatePiece } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { cn } from "@/lib/utils";

/**
 * A piece's name with a pencil that turns it into an input with save (check)
 * and cancel (cross) buttons. Enter saves, Escape cancels. Used wherever a
 * piece can be renamed: the pieces table's Namn cell and piece detail.
 *
 * Render it only in edit mode: unmounting it throws away an unsaved draft.
 */
export function PieceNameEditor({
  groupSlug,
  pieceId,
  name,
  renderName,
  className,
  inputClassName,
  onRenamed,
}: {
  groupSlug: string;
  pieceId: string;
  name: string;
  /** How the name shows while it is not being renamed, e.g. a link or a heading. */
  renderName: (name: string) => ReactNode;
  className?: string;
  inputClassName?: string;
  /**
   * Called with the Piece's new Slug after a rename, in place of refreshing
   * the page: on the Piece's own page, which moves with it (ADR-0011).
   */
  onRenamed?: (slug: string) => void;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const wasRenaming = useRef(false);

  // The saved name shows until the refresh after a save brings it in `name`.
  const [savedName, setSavedName] = useState<string | null>(null);
  const [previousName, setPreviousName] = useState(name);
  if (name !== previousName) {
    setPreviousName(name);
    setSavedName(null);
  }
  const shownName = savedName ?? name;

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (wasRenaming.current) {
      // The input is gone, so hand focus back to the pencil that opened it.
      pencilRef.current?.focus();
    }
    wasRenaming.current = isRenaming;
  }, [isRenaming]);

  function open() {
    setDraft(shownName);
    setError(null);
    setIsRenaming(true);
  }

  function close() {
    setIsRenaming(false);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draft.trim();
    if (nextName === shownName) {
      close();
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("name", draft);
      let slug: string;
      try {
        ({ slug } = await updatePiece(formData));
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte spara namn"));
        return;
      }
      startTransition(() => {
        setSavedName(nextName);
        close();
      });
      if (onRenamed) onRenamed(slug);
      else router.refresh();
    });
  }

  if (!isRenaming) {
    return (
      <div className={cn("flex min-w-0 items-center gap-1", className)}>
        {renderName(shownName)}
        <Button
          ref={pencilRef}
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={open}
          aria-label={`Byt namn på ${shownName}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("min-w-0 space-y-1", className)}>
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          name="name"
          value={draft}
          disabled={isPending}
          aria-label="Namn"
          aria-invalid={error ? true : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          className={cn("h-8", inputClassName)}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className={cn("size-7 shrink-0", "text-emerald-600 hover:text-emerald-700")}
          disabled={isPending}
          aria-label="Spara namn"
        >
          {isPending ? <Spinner /> : <Check className="size-4" aria-hidden="true" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-7 shrink-0", "text-destructive hover:text-destructive")}
          disabled={isPending}
          onClick={close}
          aria-label="Avbryt"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
