import { RequestPasswordResetForm } from "@/components/RequestPasswordResetForm";
import { hoursInSwedish } from "@/lib/auth/password-reset-email";
import { PASSWORD_RESET_VALID_FOR_HOURS } from "@/lib/auth/password-reset";

/** "Glömt lösenord": asks for the address to email a reset link to. */
export default function RequestPasswordResetPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <RequestPasswordResetForm validFor={hoursInSwedish(PASSWORD_RESET_VALID_FOR_HOURS)} />
    </main>
  );
}
