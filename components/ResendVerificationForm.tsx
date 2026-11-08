"use client";

import { useActionState } from "react";
import { resendVerification } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function ResendVerificationForm() {
  const [state, formAction, isPending] = useActionState(resendVerification, null);

  return (
    <form action={formAction} className="space-y-3">
      {state?.status === "sent" && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">Vi har skickat en ny länk.</p>
      )}
      {state?.status === "cooldown" && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Vänta {state.retryAfterSeconds} sekunder innan du skickar igen.
        </p>
      )}
      {state?.status === "failed" && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Kunde inte skicka mejlet. Försök igen.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        Skicka igen
      </Button>
    </form>
  );
}
