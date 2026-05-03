"use client";

import { useState } from "react";
import { deleteSetList } from "@/app/actions/setlists";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SetListRow = {
  id: string;
  name: string;
};

export function DeleteSetListDialog({
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
      await deleteSetList(formData);
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort repertoar"));
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
          <DialogTitle>Ta bort repertoar?</DialogTitle>
          <DialogDescription>
            <strong>{setList.name}</strong> tas bort permanent. Detta går inte att
            ångra.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
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
