"use client";

import { useState } from "react";
import { updateSetList } from "@/app/actions/setlists";
import { getThrownMessage } from "@/lib/getThrownMessage";
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

type SetListRow = {
  id: string;
  name: string;
  date: Date | null;
};

function toDateInputValue(date: Date | null): string {
  if (!date) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function EditSetListDialog({
  groupSlug,
  setList,
}: {
  groupSlug: string;
  setList: SetListRow;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await updateSetList(formData);
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte spara repertoar"));
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
        <Button variant="outline" size="sm">
          Redigera
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redigera repertoar</DialogTitle>
        </DialogHeader>
        <form key={setList.id} action={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
          <div className="space-y-2">
            <Label htmlFor={`setlist-name-${setList.id}`}>Namn</Label>
            <Input
              id={`setlist-name-${setList.id}`}
              name="name"
              required
              autoFocus
              defaultValue={setList.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`setlist-date-${setList.id}`}>Datum</Label>
            <Input
              id={`setlist-date-${setList.id}`}
              name="date"
              type="date"
              defaultValue={toDateInputValue(setList.date)}
            />
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
