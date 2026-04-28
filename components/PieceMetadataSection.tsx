"use client";

import { useState, useTransition } from "react";
import { updatePieceMetadata } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PieceMetadataSectionProps = {
  groupSlug: string;
  pieceId: string;
  initialName: string;
};

export function PieceMetadataSection({
  groupSlug,
  pieceId,
  initialName,
}: PieceMetadataSectionProps) {
  const [savedName, setSavedName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setIsEditing(false);
    setDraftName(savedName);
    setError(null);
    setSuccessMessage(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await updatePieceMetadata(formData);
        const nextName = String(formData.get("name") ?? "").trim();
        setSavedName(nextName);
        setDraftName(nextName);
        setIsEditing(false);
        setSuccessMessage("Metadata sparades.");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Kunde inte spara metadata");
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Metadata</h2>
        {!isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Redigera
          </Button>
        ) : null}
      </div>

      {!isEditing ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">ID</dt>
          <dd>{pieceId}</dd>
          <dt className="text-muted-foreground">Namn</dt>
          <dd>{savedName}</dd>
        </dl>
      ) : (
        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={pieceId} />
          <div className="space-y-2">
            <Label htmlFor="piece-name">Namn</Label>
            <Input
              id="piece-name"
              name="name"
              value={draftName}
              required
              disabled={isPending}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sparar..." : "Spara"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isPending}>
              Avbryt
            </Button>
          </div>
        </form>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
    </section>
  );
}
