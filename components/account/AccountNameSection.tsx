"use client";

import { useActionState } from "react";
import { changeOwnName } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Namn" on the account page: the User's name as the Members of their Groups
 * see it, which they can change. After a failed save the field keeps what was
 * typed; after a successful one it shows the saved name.
 */
export function AccountNameSection({ name }: { name: string }) {
  const [state, formAction, isPending] = useActionState(changeOwnName, null);
  const shownName = state?.status === "error" ? state.values.name : name;

  return (
    <section className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Namn</h2>
      <p className="text-sm text-muted-foreground">Ditt namn visas för de andra medlemmarna i dina grupper.</p>

      <form action={formAction} className="space-y-4">
        {state?.status === "error" ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
        ) : null}
        {state?.status === "saved" ? (
          <p role="status" className="text-sm text-muted-foreground">
            Namnet är sparat.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="account-name">Namn</Label>
          <Input id="account-name" name="name" autoComplete="name" required defaultValue={shownName} />
        </div>

        <Button type="submit" disabled={isPending}>
          Spara
        </Button>
      </form>
    </section>
  );
}
