"use client";

import { useRef, useState } from "react";
import { createSetList } from "@/app/actions/setlists";
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

export function CreateSetListDialog({ groupSlug }: { groupSlug: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await createSetList(formData);
      setOpen(false);
      setError(null);
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skapa repertoar");
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
        <Button>Lägg till</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lägg till repertoar</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <div className="space-y-2">
            <Label htmlFor="setlist-name">Namn</Label>
            <Input id="setlist-name" name="name" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setlist-date">Datum</Label>
            <Input id="setlist-date" name="date" type="date" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
