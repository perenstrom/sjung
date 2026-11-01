"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(logIn, null);

  return (
    <form
      action={formAction}
      className="w-full space-y-6 rounded-xl border p-6"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Logga in</h1>
        <p className="text-sm text-muted-foreground">
          Ange e-post och lösenord för att komma till appen.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <input type="hidden" name="next" value={nextPath} />

      {/* React resets the form after each submit, to defaultValue: email survives, password doesn't. */}
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
        <Input id="password" name="password" type="password" required />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        Logga in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Saknar konto?{" "}
        <Link href={`/auth/signup?next=${encodeURIComponent(nextPath)}`}>
          Skapa konto
        </Link>
      </p>
    </form>
  );
}
