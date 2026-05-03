"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePieceMetadata } from "@/app/actions/pieces";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const router = useRouter();
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
        router.refresh();
      } catch (submitError) {
        setError(getThrownMessage(submitError, "Kunde inte spara metadata"));
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg font-medium">Metadata</h2>
        {!isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Redigera
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!isEditing ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">ID</dt>
            <dd>{pieceId}</dd>
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
      </CardContent>
    </Card>
  );
}
