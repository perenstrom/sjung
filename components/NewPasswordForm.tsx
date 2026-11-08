"use client";

import { useActionState } from "react";
import { setNewPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIGNUP_PASSWORD_MIN_LENGTH } from "@/lib/schemas/auth";

export function NewPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, isPending] = useActionState(setNewPassword, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Välj nytt lösenord</h1>
        <p className="text-sm text-muted-foreground">
          För kontot <strong className="text-foreground">{email}</strong>. Du loggas ut på alla
          enheter när lösenordet är bytt.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <Label htmlFor="password">Nytt lösenord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={SIGNUP_PASSWORD_MIN_LENGTH}
          required
        />
        <p className="text-sm text-muted-foreground">Minst 12 tecken.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">Upprepa lösenord</Label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        Spara nytt lösenord
      </Button>
    </form>
  );
}
