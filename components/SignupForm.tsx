"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, signUpFromInvitationForm } from "@/app/actions/auth";
import { loginPath } from "@/lib/auth/routes";
import { invitationPagePath } from "@/lib/invitations/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/schemas/auth";

type SignupFormProps =
  | { nextPath: string; invitation?: never }
  /** Signup from an Invitation: the email is locked to the invited address. */
  | { nextPath?: never; invitation: { token: string; email: string; groupName: string } };

export function SignupForm({ nextPath, invitation }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(
    invitation ? signUpFromInvitationForm : signUp,
    null
  );
  // Logging in instead returns to where signing up would have led.
  const loginHref = loginPath(invitation ? invitationPagePath(invitation.token) : nextPath);

  return (
    <form
      action={formAction}
      className="w-full space-y-6 rounded-xl border p-6"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Skapa konto</h1>
        <p className="text-sm text-muted-foreground">
          {invitation
            ? `Skapa ett konto för att gå med i ${invitation.groupName} på Sjung.`
            : "Registrera dig för att komma igång med Sjung."}
        </p>
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
          {state.error === "Det finns redan ett konto med den e-postadressen" && (
            <>
              {" "}
              <Link href={loginHref} className="underline">
                Logga in
              </Link>
            </>
          )}
        </p>
      )}

      {invitation ? (
        <input type="hidden" name="invitation" value={invitation.token} />
      ) : (
        <input type="hidden" name="next" value={nextPath} />
      )}

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
        {invitation ? (
          // Shown only: the server takes the address from the Invitation.
          <Input
            id="email"
            type="email"
            value={invitation.email}
            readOnly
            className="bg-muted text-muted-foreground"
          />
        ) : (
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={state?.values.email}
            required
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Lösenord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
        <p className="text-sm text-muted-foreground">Minst {PASSWORD_MIN_LENGTH} tecken.</p>
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
        <Link href={loginHref}>
          Logga in
        </Link>
      </p>
    </form>
  );
}
