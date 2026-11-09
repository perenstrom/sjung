"use client";

import { useActionState } from "react";
import { inviteMemberToGroup } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteGroupMemberForm({ groupSlug }: { groupSlug: string }) {
  const [state, formAction, isPending] = useActionState(inviteMemberToGroup, null);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="groupSlug" value={groupSlug} />
        {/* Keyed so a sent invitation clears the field, while a failed one keeps what was typed. */}
        <Input
          key={state?.status === "sent" ? `sent-${state.email}` : "input"}
          type="email"
          name="email"
          placeholder="namn@exempel.se"
          autoComplete="off"
          defaultValue={state?.status === "error" ? state.values.email : undefined}
          required
          className="sm:max-w-xs"
        />
        <Button type="submit" disabled={isPending}>
          Bjud in
        </Button>
      </div>
      {state?.status === "sent" && (
        <p className="text-sm text-muted-foreground" role="status">
          Inbjudan skickad till {state.email}.
        </p>
      )}
      {state?.status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
