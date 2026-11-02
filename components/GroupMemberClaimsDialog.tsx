"use client";

import { ShieldCheck } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { setMemberClaims } from "@/app/actions/groups";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GROUP_CLAIM_OPTIONS } from "@/lib/group-claims";
import { getThrownMessage } from "@/lib/getThrownMessage";

type GroupMember = {
  id: string;
  name: string;
  email: string;
  claims: GroupClaim[];
};

export function GroupMemberClaimsDialog({
  groupSlug,
  member,
}: {
  groupSlug: string;
  member: GroupMember;
}) {
  const idPrefix = useId();
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

  function toggleClaim(claim: GroupClaim, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, claim] : current.filter((entry) => entry !== claim)
    );
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
          {selected.map((claim) => (
            <input key={claim} type="hidden" name="claims" value={claim} />
          ))}
          <div className="space-y-4">
            {GROUP_CLAIM_OPTIONS.map(({ claim, label, description }) => {
              const checkboxId = `${idPrefix}-${claim}`;
              return (
                <div key={claim} className="flex items-start gap-3">
                  <Checkbox
                    id={checkboxId}
                    className="mt-0.5"
                    checked={selected.includes(claim)}
                    onCheckedChange={(checked) => toggleClaim(claim, checked === true)}
                    disabled={isPending}
                    aria-describedby={`${checkboxId}-description`}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={checkboxId}>{label}</Label>
                    <p id={`${checkboxId}-description`} className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
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
