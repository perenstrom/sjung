"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIGNUP_PASSWORD_MIN_LENGTH } from "@/lib/schemas/auth";

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(signUp, null);

  return (
    <form
      action={formAction}
      className="w-full space-y-6 rounded-xl border p-6"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Skapa konto</h1>
        <p className="text-sm text-muted-foreground">
          Registrera dig för att komma igång med Sjung.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <input type="hidden" name="next" value={nextPath} />

      {/* React resets the form after each submit, to defaultValue: name and email survive, the passwords don't. */}
      <div className="space-y-2">
        <Label htmlFor="name">Namn</Label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={state?.values.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state?.values.email}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Lösenord</Label>
        <Input
          id="password"
          name="password"
          type="password"
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
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        Skapa konto
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Har du redan konto?{" "}
        <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>
          Logga in
        </Link>
      </p>
    </form>
  );
}
