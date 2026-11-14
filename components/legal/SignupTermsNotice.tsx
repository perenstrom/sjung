import Link from "next/link";
import { PRIVACY_POLICY_PATH, TERMS_OF_USE_PATH } from "@/lib/legal/routes";

/**
 * Beneath the signup button. Informs only: nothing is stored and there is no
 * checkbox (see Privacy policy in CONTEXT.md).
 */
export function SignupTermsNotice() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Genom att skapa ett konto godkänner du{" "}
      <Link href={TERMS_OF_USE_PATH} className="underline">
        användarvillkoren
      </Link>
      . Läs om hur vi hanterar personuppgifter i vår{" "}
      <Link href={PRIVACY_POLICY_PATH} className="underline">
        integritetspolicy
      </Link>
      .
    </p>
  );
}
