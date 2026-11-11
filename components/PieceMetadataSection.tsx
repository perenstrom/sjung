"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePiece } from "@/app/actions/pieces";
import { useEditMode } from "@/components/EditModeContext";
import { EditModeToggle } from "@/components/EditModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getThrownMessage } from "@/lib/getThrownMessage";

type PieceMetadataSectionProps = {
  groupSlug: string;
  pieceId: string;
  initialName: string;
};

export function PieceMetadataSection(props: PieceMetadataSectionProps) {
  const { isEditing } = useEditMode();

  if (!isEditing) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold break-words">{props.initialName}</h1>
          <div className="shrink-0">
            <EditModeToggle />
          </div>
        </div>
      </section>
    );
  }

  // Unmounted when edit mode ends, which discards an unsaved name.
  return <PieceNameEditor {...props} />;
}

function PieceNameEditor({
  groupSlug,
  pieceId,
  initialName,
}: PieceMetadataSectionProps) {
  const router = useRouter();
  const [savedName, setSavedName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setIsRenaming(false);
    setDraftName(savedName);
    setError(null);
    setSuccessMessage(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await updatePiece(formData);
        const nextName = String(formData.get("name") ?? "").trim();
        setSavedName(nextName);
        setDraftName(nextName);
        setIsRenaming(false);
        setSuccessMessage("Namn sparat.");
        router.refresh();
      } catch (submitError) {
        setError(getThrownMessage(submitError, "Kunde inte spara namn"));
      }
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        {!isRenaming ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-2xl font-semibold break-words">{savedName}</h1>
            {/* Below md the edit action gets its own row under the title. */}
            <div className="basis-full md:basis-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRenaming(true)}>
                Byt namn
              </Button>
            </div>
          </div>
        ) : (
          <form action={handleSubmit} className="flex flex-1 flex-wrap items-center gap-2">
            <input type="hidden" name="groupSlug" value={groupSlug} />
            <input type="hidden" name="pieceId" value={pieceId} />
            <Input
              id="piece-name"
              name="name"
              value={draftName}
              required
              disabled={isPending}
              onChange={(event) => setDraftName(event.target.value)}
              className="h-10 max-w-md text-lg font-semibold"
            />
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Sparar..." : "Spara"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
              Avbryt
            </Button>
          </form>
        )}
        <div className="shrink-0">
          <EditModeToggle />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
    </section>
  );
}
