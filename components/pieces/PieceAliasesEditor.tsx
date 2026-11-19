"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { addPieceAlias, removePieceAlias } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getThrownMessage } from "@/lib/getThrownMessage";
import type { PieceAliasItem } from "@/lib/pieces/types";

const ADD_LABEL = "Lägg till alternativt namn";

/**
 * A Piece's Aliases in edit mode, under its name on piece detail: each with a
 * button to remove it, then a field to add another. Every add and remove saves
 * at once, like renaming the Piece; an Alias is changed by removing it and
 * adding it again.
 */
export function PieceAliasesEditor({
  groupSlug,
  pieceId,
  aliases,
}: {
  groupSlug: string;
  pieceId: string;
  aliases: readonly PieceAliasItem[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim() === "") return;

    setError(null);
    startAdding(async () => {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("name", draft);
      try {
        await addPieceAlias(formData);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte lägga till alternativt namn"));
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  async function handleRemove(aliasId: string) {
    setError(null);
    setRemovingId(aliasId);
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceAliasId", aliasId);
      await removePieceAlias(formData);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort alternativt namn"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-1">
      {aliases.length > 0 ? (
        <ul className="space-y-1">
          {aliases.map((alias) => (
            <li key={alias.id} className="text-muted-foreground flex items-center gap-1 text-sm">
              <span className="min-w-0 break-words">{alias.name}</span>
              <Button
                type="button"
                variant="ghost-destructive"
                size="icon"
                // The touch-sized target overhangs the name's line instead of pushing it down.
                className="size-7 shrink-0 pointer-coarse:-my-2"
                onClick={() => handleRemove(alias.id)}
                disabled={removingId === alias.id}
                aria-label={`Ta bort ${alias.name}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={handleAdd} className="flex max-w-md items-center gap-1">
        <Input
          value={draft}
          disabled={isAdding}
          aria-label={ADD_LABEL}
          placeholder={ADD_LABEL}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setDraft(event.target.value)}
          className="h-8"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          disabled={isAdding || draft.trim() === ""}
          aria-label="Lägg till"
        >
          {isAdding ? <Spinner /> : <Plus className="size-4" aria-hidden="true" />}
        </Button>
      </form>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
