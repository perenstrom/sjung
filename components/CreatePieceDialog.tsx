"use client";

import { type FormEvent, useRef, useState } from "react";
import { createPiece } from "@/app/actions/pieces";
import { PieceCreditDraftRow } from "@/components/pieces/PieceCreditDraftRow";
import {
  PieceCreditsList,
  RemoveCreditRoleButton,
} from "@/components/pieces/PieceCreditsList";
import { getThrownMessage } from "@/lib/getThrownMessage";
import {
  type CreditForDisplay,
  creditKey,
  EMPTY_CREDIT_DRAFT,
  resolveCreditsToSubmit,
} from "@/lib/pieces/credits";
import type { Person } from "@/types/piece-credit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePieceDialog({
  people,
  groupSlug,
}: {
  people: Person[];
  groupSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditForDisplay[]>([]);
  const [draft, setDraft] = useState(EMPTY_CREDIT_DRAFT);
  const formRef = useRef<HTMLFormElement>(null);

  function removeCredit(credit: CreditForDisplay) {
    setCredits((prev) => prev.filter((c) => creditKey(c) !== creditKey(credit)));
  }

  // Checked before the form action runs, so a half-picked credit doesn't
  // reset the form.
  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    const resolved = resolveCreditsToSubmit(credits, draft);
    if ("error" in resolved) {
      event.preventDefault();
      setDraftError(resolved.error);
    }
  }

  async function handleSubmit(formData: FormData) {
    const resolved = resolveCreditsToSubmit(credits, draft);
    if ("error" in resolved) return;

    formData.set(
      "credits",
      JSON.stringify(resolved.credits.map(({ personId, role }) => ({ personId, role })))
    );
    try {
      await createPiece(formData);
      setError(null);
      setOpen(false);
      setCredits([]);
      setDraft(EMPTY_CREDIT_DRAFT);
      formRef.current?.reset();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte skapa not"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setDraftError(null);
          // People created in the add row are only known to it, and it
          // unmounts with the dialog.
          setDraft(EMPTY_CREDIT_DRAFT);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Lägg till</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lägg till noter</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={handleSubmit}
          onSubmit={handleFormSubmit}
          className="space-y-5"
        >
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input id="name" name="name" required autoFocus />
          </div>

          <div className="space-y-3">
            <Label>Medverkande</Label>

            {credits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
            ) : (
              <PieceCreditsList
                credits={credits}
                className="space-y-2"
                renderRoleAction={(credit) => (
                  <RemoveCreditRoleButton credit={credit} onRemove={removeCredit} />
                )}
              />
            )}

            <div className="border-t pt-3">
              <PieceCreditDraftRow
                groupSlug={groupSlug}
                people={people}
                credits={credits}
                draft={draft}
                onDraftChange={(nextDraft) => {
                  setDraft(nextDraft);
                  setDraftError(null);
                }}
                onAdd={(credit) => setCredits((prev) => [...prev, credit])}
              />
            </div>
          </div>

          {draftError ? <p className="text-sm text-destructive">{draftError}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
