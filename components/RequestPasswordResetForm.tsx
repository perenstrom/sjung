"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetForm } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RequestPasswordResetForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetForm, null);

  return (
    <form action={formAction} className="w-full space-y-6 rounded-xl border p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Återställ lösenord</h1>
        <p className="text-sm text-muted-foreground">
          Ange din e-postadress så skickar vi en länk där du kan välja ett nytt lösenord.
        </p>
      </div>

      {/* Same message whether or not the address has an account. */}
      {state?.status === "sent" && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Om det finns ett konto för <strong>{state.email}</strong> har vi skickat en länk dit. Den
          gäller i 1 timme.
        </p>
      )}

      {state?.status === "error" && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state?.status === "error" ? state.values.email : state?.email}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        Skicka länk
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login">Tillbaka till inloggningen</Link>
      </p>
    </form>
  );
}
