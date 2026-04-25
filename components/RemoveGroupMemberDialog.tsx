"use client";

import { useState } from "react";
import { removeMemberFromGroup } from "@/app/actions/groups";
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

type GroupMember = {
  id: string;
  name: string;
  email: string;
};

export function RemoveGroupMemberDialog({
  groupSlug,
  member,
}: {
  groupSlug: string;
  member: GroupMember;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await removeMemberFromGroup(formData);
      setError(null);
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kunde inte ta bort medlem";
      setError(message);
    }
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
          <DialogTitle>Ta bort medlem?</DialogTitle>
          <DialogDescription>
            <strong>{member.name}</strong> ({member.email}) tas bort från gruppen.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="memberUserId" value={member.id} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" variant="destructive">
              Ta bort
            </Button>
          </DialogFooter>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
