"use client";

import { useState } from "react";
import { addMemberToGroup } from "@/app/actions/groups";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddGroupMemberForm({ groupSlug }: { groupSlug: string }) {
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    try {
      await addMemberToGroup(formData);
      setError(null);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till medlem"));
    }
  }

  return (
    <form action={handleAction} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <Input
        type="email"
        name="email"
        placeholder="namn@exempel.se"
        autoComplete="email"
        required
        className="sm:max-w-xs"
      />
      <Button type="submit">Lägg till medlem</Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
