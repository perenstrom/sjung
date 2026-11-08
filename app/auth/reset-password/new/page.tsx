import Link from "next/link";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { Button } from "@/components/ui/button";
import { getPasswordResetTokenState } from "@/lib/auth/password-reset";
import { REQUEST_PASSWORD_RESET_PATH } from "@/lib/auth/password-reset-routes";

type NewPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

// Opening this page must never use up the token: mail scanners open links
// before the human does. The token is only used by the form's POST
// (`setNewPassword`). Same reasoning as the verify-email confirm page.
export default async function NewPasswordPage({ searchParams }: NewPasswordPageProps) {
  const { token } = await searchParams;
  const tokenState = token
    ? await getPasswordResetTokenState(token)
    : { state: "invalid" as const };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <div className="w-full space-y-6 rounded-xl border p-6">
        {tokenState.state === "valid" && token ? (
          <NewPasswordForm token={token} email={tokenState.email} />
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Länken fungerar inte</h1>
              <p className="text-sm text-muted-foreground">
                Länken är ogiltig, har redan använts eller har gått ut. Be om en ny.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href={REQUEST_PASSWORD_RESET_PATH}>Skicka en ny länk</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
