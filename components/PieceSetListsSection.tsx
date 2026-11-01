"use client";

import { addPieceToSetList, removePieceFromSetList } from "@/app/actions/setlists";
import { useEditMode } from "@/components/EditModeContext";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type PieceSetListEntry = {
  id: string;
  setListId: string;
  setListName: string;
};

export type PieceSetListOption = {
  id: string;
  name: string;
};

type PieceSetListsSectionProps = {
  groupSlug: string;
  pieceId: string;
  entries: PieceSetListEntry[];
  allSetLists: PieceSetListOption[];
};

export function PieceSetListsSection(props: PieceSetListsSectionProps) {
  const { isEditing } = useEditMode();
  // Remount on every toggle so leaving edit mode discards a half-picked Set list.
  return (
    <PieceSetListsCard
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      {...props}
    />
  );
}

function PieceSetListsCard({
  readOnly,
  groupSlug,
  pieceId,
  entries,
  allSetLists,
}: PieceSetListsSectionProps & { readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pickedSetListId, setPickedSetListId] = useState("");

  const memberSetIds = useMemo(
    () => new Set(entries.map((e) => e.setListId)),
    [entries]
  );
  const available = useMemo(
    () => allSetLists.filter((sl) => !memberSetIds.has(sl.id)),
    [allSetLists, memberSetIds]
  );

  // A pick that has since become unavailable (e.g. added elsewhere) counts as no pick.
  const selectedSetListId = available.some((sl) => sl.id === pickedSetListId)
    ? pickedSetListId
    : "";

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
        setPickedSetListId("");
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
    <Card>
      <CardHeader className="space-y-0">
        <h2 className="text-lg font-medium">Repertoarer</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Stycket finns inte i någon repertoar ännu.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link className="underline" href={`/app/${groupSlug}/setlists/${entry.setListId}`}>
                  {entry.setListName}
                </Link>
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => submitRemove(entry.id)}
                  >
                    Ta bort från repertoar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {readOnly ? null : (
          <form onSubmit={submitAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:min-w-[14rem] sm:flex-1">
              <label htmlFor={`add-setlist-${pieceId}`} className="text-sm font-medium">
                Lägg till i repertoar
              </label>
              {allSetLists.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Inga repertoarer finns än. Skapa en under{" "}
                  <Link className="underline" href={`/app/${groupSlug}/setlists`}>
                    Repertoarer
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
                  onChange={(event) => setPickedSetListId(event.target.value)}
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
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
