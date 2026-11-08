import Link from "next/link";
import { confirmEmail } from "@/app/actions/auth";
import { InvalidLinkNotice } from "@/components/InvalidLinkNotice";
import { Button } from "@/components/ui/button";
import { getVerificationTokenState } from "@/lib/auth/email-verification";
import { VERIFY_EMAIL_PATH } from "@/lib/auth/routes";

type ConfirmEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

// Opening this page must never verify anything. Mail scanners (Outlook Safe
// Links, Mimecast, …) open links before the human does, so verify-on-GET would
// let a victim's scanner verify an account someone else registered with their
// address. Verification happens only on the button POST (`confirmEmail`).
// Same approach as django-allauth's ACCOUNT_CONFIRM_EMAIL_ON_GET = False and
// Supabase's email-prefetching guidance. Don't "simplify" this to verify here.
export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
  const { token } = await searchParams;
  const tokenState = token ? await getVerificationTokenState(token) : { state: "invalid" as const };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <div className="w-full space-y-6 rounded-xl border p-6">
        {tokenState.state === "valid" && (
          <form action={confirmEmail} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Bekräfta e-postadress</h1>
              <p className="text-sm text-muted-foreground">
                Bekräfta att <strong className="text-foreground">{tokenState.email}</strong> är din
                e-postadress.
              </p>
            </div>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Bekräfta e-postadressen för {tokenState.email}
            </Button>
          </form>
        )}

        {tokenState.state === "already-verified" && (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">E-postadressen är bekräftad</h1>
              <p className="text-sm text-muted-foreground">
                Din e-postadress är redan bekräftad. Du kan börja använda Sjung.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/app">Gå till Sjung</Link>
            </Button>
          </>
        )}

        {tokenState.state === "invalid" && (
          <InvalidLinkNotice
            message="Länken är ogiltig eller har gått ut. Logga in för att få en ny."
            newLinkHref={VERIFY_EMAIL_PATH}
          />
        )}
      </div>
    </main>
  );
}
