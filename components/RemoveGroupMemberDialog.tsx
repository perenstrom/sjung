"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { removeMemberFromGroup } from "@/app/actions/groups";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      setError(getThrownMessage(err, "Kunde inte ta bort medlem"));
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
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              aria-label={`Ta bort ${member.name}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Ta bort</TooltipContent>
      </Tooltip>
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
