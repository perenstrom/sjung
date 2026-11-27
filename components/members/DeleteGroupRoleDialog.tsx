"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteGroupRole } from "@/app/actions/group-roles";
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
import { RoleActionTooltip } from "@/components/members/RoleActionTooltip";
import { getThrownMessage } from "@/lib/getThrownMessage";

/** What deleting the Role does to its holders, in one sentence. */
export function deleteRoleConsequence(holderCount: number): string {
  if (holderCount === 0) {
    return "Ingen medlem har rollen.";
  }
  const holders = holderCount === 1 ? "1 medlem har" : `${holderCount} medlemmar har`;
  return `${holders} rollen och förlorar de behörigheter de bara har genom den.`;
}

/** "Ta bort" on a Role, allowed while Members hold it; the confirmation says how many do. */
export function DeleteGroupRoleDialog({
  groupSlug,
  role,
  disabledReason,
}: {
  groupSlug: string;
  role: { id: string; name: string; holderCount: number };
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    try {
      await deleteGroupRole(formData);
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort rollen"));
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
      <RoleActionTooltip label="Ta bort" disabledReason={disabledReason}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label={`Ta bort ${role.name}`}
            disabled={disabledReason !== undefined}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </DialogTrigger>
      </RoleActionTooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort roll?</DialogTitle>
          <DialogDescription>
            Rollen <strong>{role.name}</strong> tas bort. {deleteRoleConsequence(role.holderCount)}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="roleId" value={role.id} />
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
