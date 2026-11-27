"use client";

import { Pencil, Plus } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { createGroupRole, updateGroupRole } from "@/app/actions/group-roles";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleActionTooltip } from "@/components/members/RoleActionTooltip";
import type { RoleClaims } from "@/lib/group-roles";
import { ROLE_NAME_MAX_LENGTH } from "@/lib/schemas/groups";
import { getThrownMessage } from "@/lib/getThrownMessage";

/**
 * "Ny roll" without a `role`, otherwise "Redigera" on that Role: its name and
 * its Claims, saved together. `disabledReason` shows the edit button disabled
 * with that reason as its tooltip.
 */
export function GroupRoleDialog({
  groupSlug,
  role,
  disabledReason,
}: {
  groupSlug: string;
  role?: RoleClaims;
  disabledReason?: string;
}) {
  const nameId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role?.name ?? "");
  const [selected, setSelected] = useState<GroupClaim[]>([...(role?.claims ?? [])]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(role?.name ?? "");
      setSelected([...(role?.claims ?? [])]);
    } else {
      setError(null);
    }
  }

  // Submitted via onSubmit, as in the Claims dialog, so a failed save keeps the ticked Claims.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await (role ? updateGroupRole(formData) : createGroupRole(formData));
        setOpen(false);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte spara rollen"));
      }
    });
  }

  const title = role ? "Redigera roll" : "Ny roll";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {role ? (
        <RoleActionTooltip label="Redigera" disabledReason={disabledReason}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Redigera ${role.name}`}
              disabled={disabledReason !== undefined}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          </DialogTrigger>
        </RoleActionTooltip>
      ) : (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Ny roll
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Medlemmar med rollen får alla dess behörigheter. Ändringar gäller direkt för alla som har rollen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          {role ? <input type="hidden" name="roleId" value={role.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor={nameId}>Namn</Label>
            <Input
              id={nameId}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={ROLE_NAME_MAX_LENGTH}
              required
              disabled={isPending}
            />
          </div>
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
