import { redirect } from "next/navigation";
import { logOut } from "@/app/actions/auth";
import { ResendVerificationForm } from "@/components/ResendVerificationForm";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-user";
import { isSendFailedFlag, VERIFY_EMAIL_PATH } from "@/lib/auth/verify-email-routes";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    skickat?: string;
  }>;
};

/** Where an Unverified user is held until they confirm their email address. */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(VERIFY_EMAIL_PATH)}`);
  }
  if (user.emailVerifiedAt) {
    redirect("/app");
  }

  const { skickat } = await searchParams;
  const sendFailed = isSendFailedFlag(skickat);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <div className="w-full space-y-6 rounded-xl border p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Bekräfta din e-postadress</h1>
          {sendFailed ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Vi kunde inte skicka mejlet till <strong>{user.email}</strong>. Försök igen.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vi har skickat en länk till <strong className="text-foreground">{user.email}</strong>.
              Öppna den för att börja använda Sjung.
            </p>
          )}
        </div>

        <ResendVerificationForm />

        <form action={logOut}>
          <Button type="submit" variant="link" className="w-full">
            Logga ut
          </Button>
        </form>
      </div>
    </main>
  );
}
