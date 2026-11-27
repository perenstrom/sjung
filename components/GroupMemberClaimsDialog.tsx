"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { setMemberClaims } from "@/app/actions/groups";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import { ClaimCheckboxList } from "@/components/members/ClaimCheckboxList";
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
import { getThrownMessage } from "@/lib/getThrownMessage";

type GroupMember = {
  id: string;
  name: string;
  email: string;
  claims: GroupClaim[];
};

export function GroupMemberClaimsDialog({ groupSlug, member }: { groupSlug: string; member: GroupMember }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GroupClaim[]>(member.claims);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelected(member.claims);
    } else {
      setError(null);
    }
  }

  // Submitted via onSubmit rather than a form action: React resets a form after its action,
  // and Radix Checkbox follows that reset back to its initial state, which would wipe the
  // selection when a save fails.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await setMemberClaims(formData);
        setOpen(false);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte spara behörigheter"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Behörigheter för ${member.name}`}
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Behörigheter</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Behörigheter</DialogTitle>
          <DialogDescription>
            <strong>{member.name}</strong> ({member.email})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="memberUserId" value={member.id} />
          <ClaimCheckboxList selected={selected} onSelectedChange={setSelected} disabled={isPending} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sparar..." : "Spara"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
