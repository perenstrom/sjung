"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";

import { deletePerson } from "@/app/actions/people";
import { DeletePersonWarning } from "@/components/people/DeletePersonWarning";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getThrownMessage } from "@/lib/getThrownMessage";

/** Deletes a Person with all of their Credits; the action then sends the user to Upphovspersoner. */
export function DeletePersonDialog({
  groupSlug,
  person,
}: {
  groupSlug: string;
  person: { id: string; name: string; pieces: readonly { pieceId: string; name: string }[] };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await deletePerson(formData);
    } catch (err) {
      // The action ends in a redirect, which Next rejects with; let it through to navigate.
      unstable_rethrow(err);
      setError(getThrownMessage(err, "Kunde inte ta bort upphovsperson"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Ta bort
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort upphovsperson?</DialogTitle>
          <DeletePersonWarning personName={person.name} pieces={person.pieces} />
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="personId" value={person.id} />
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" variant="destructive">
              Ta bort
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
