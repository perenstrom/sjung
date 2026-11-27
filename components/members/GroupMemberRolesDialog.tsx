"use client";

import { Tags } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { setMemberRoles } from "@/app/actions/group-roles";
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
import { roleClaimSummary, type RoleClaims } from "@/lib/group-roles";
import { getThrownMessage } from "@/lib/getThrownMessage";

type GroupMember = {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
};

/** "Roller" on a Member: tick the Roles they should hold. */
export function GroupMemberRolesDialog({
  groupSlug,
  member,
  roles,
}: {
  groupSlug: string;
  member: GroupMember;
  roles: readonly RoleClaims[];
}) {
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(member.roleIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelected(member.roleIds);
    } else {
      setError(null);
    }
  }

  function toggleRole(roleId: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, roleId] : current.filter((entry) => entry !== roleId)));
  }

  // Submitted via onSubmit for the same reason as the Claims dialog: a form action would
  // reset the Radix checkboxes and lose the selection when a save fails.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await setMemberRoles(formData);
        setOpen(false);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte spara roller"));
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
              aria-label={`Roller för ${member.name}`}
            >
              <Tags className="size-4" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Roller</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roller</DialogTitle>
          <DialogDescription>
            <strong>{member.name}</strong> ({member.email})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="memberUserId" value={member.id} />
          {selected.map((roleId) => (
            <input key={roleId} type="hidden" name="roleIds" value={roleId} />
          ))}
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Gruppen har inga roller än.</p>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => {
                const checkboxId = `${idPrefix}-${role.id}`;
                return (
                  <div key={role.id} className="flex items-start gap-3">
                    <Checkbox
                      id={checkboxId}
                      className="mt-0.5"
                      checked={selected.includes(role.id)}
                      onCheckedChange={(checked) => toggleRole(role.id, checked === true)}
                      disabled={isPending}
                      aria-describedby={`${checkboxId}-claims`}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={checkboxId}>{role.name}</Label>
                      <p id={`${checkboxId}-claims`} className="text-sm text-muted-foreground">
                        {roleClaimSummary(role)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
