"use client";

import { useState } from "react";
import { useControllableOpen } from "@/hooks/use-controllable-open";
import { deleteGroup } from "@/app/actions/groups";
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

type GroupRow = {
  id: string;
  name: string;
};

export function DeleteGroupDialog({
  group,
  open: openControlled,
  onOpenChange: onOpenChangeExternal,
}: {
  group: GroupRow;
  /** Pass to open it from elsewhere, e.g. a menu item; it then renders no trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { open, setOpen, isControlled } = useControllableOpen({
    open: openControlled,
    onOpenChange: onOpenChangeExternal,
    onClose: () => setError(null),
  });

  async function handleSubmit(formData: FormData) {
    try {
      await deleteGroup(formData);
      setOpen(false);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort grupp"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isControlled ? null : (
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Ta bort
          </Button>
        </DialogTrigger>
      )}
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
