"use client";

import { useState } from "react";
import { deleteGroup } from "@/app/actions/groups";
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

type GroupRow = {
  id: string;
  name: string;
};

export function DeleteGroupDialog({ group }: { group: GroupRow }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await deleteGroup(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Ta bort
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort grupp?</DialogTitle>
          <DialogDescription>
            Gruppen <strong>{group.name}</strong> tas bort permanent. All data
            som hör till gruppen raderas. Detta går inte att ångra.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="id" value={group.id} />
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
