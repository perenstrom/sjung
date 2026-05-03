"use client";

import { addPieceToSetList, removePieceFromSetList } from "@/app/actions/setlists";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

export type PieceSetListEntry = {
  id: string;
  setListId: string;
  setListName: string;
};

export type PieceSetListOption = {
  id: string;
  name: string;
};

export function PieceSetListsSection({
  groupSlug,
  pieceId,
  entries,
  allSetLists,
}: {
  groupSlug: string;
  pieceId: string;
  entries: PieceSetListEntry[];
  allSetLists: PieceSetListOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedSetListId, setSelectedSetListId] = useState("");

  const memberSetIds = useMemo(
    () => new Set(entries.map((e) => e.setListId)),
    [entries]
  );
  const available = useMemo(
    () => allSetLists.filter((sl) => !memberSetIds.has(sl.id)),
    [allSetLists, memberSetIds]
  );

  useEffect(() => {
    if (
      selectedSetListId &&
      !available.some((sl) => sl.id === selectedSetListId)
    ) {
      setSelectedSetListId("");
    }
  }, [available, selectedSetListId]);

  function submitAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selectedSetListId) {
      setError("Välj en repertoar.");
      return;
    }
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("setListId", selectedSetListId);
    formData.set("pieceId", pieceId);
    startTransition(async () => {
      try {
        await addPieceToSetList(formData);
        setSelectedSetListId("");
        router.refresh();
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte lägga till stycket"));
      }
    });
  }

  function submitRemove(setListPieceId: string) {
    setError(null);
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("setListPieceId", setListPieceId);
    startTransition(async () => {
      try {
        await removePieceFromSetList(formData);
        router.refresh();
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte ta bort kopplingen"));
      }
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Setlists</h2>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Stycket finns inte i någon setlist ännu.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
              <Link className="underline" href={`/app/${groupSlug}/setlists/${entry.setListId}`}>
                {entry.setListName}
              </Link>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => submitRemove(entry.id)}
              >
                Ta bort från repertoar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submitAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:min-w-[14rem] sm:flex-1">
          <label htmlFor={`add-setlist-${pieceId}`} className="text-sm font-medium">
            Lägg till i repertoar
          </label>
          {allSetLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga repertoarer finns än. Skapa en under{" "}
              <Link className="underline" href={`/app/${groupSlug}/setlists`}>
                Setlists
              </Link>
              .
            </p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Stycket ingår redan i alla repertoarer i gruppen.
            </p>
          ) : (
            <select
              id={`add-setlist-${pieceId}`}
              name="setListId"
              className={cn(
                "flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              value={selectedSetListId}
              onChange={(event) => setSelectedSetListId(event.target.value)}
              disabled={isPending}
              required
            >
              <option value="">Välj repertoar…</option>
              {available.map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {allSetLists.length > 0 && available.length > 0 ? (
          <Button type="submit" disabled={isPending || !selectedSetListId}>
            {isPending ? "Sparar..." : "Lägg till"}
          </Button>
        ) : null}
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
