import Link from "next/link";
import { getSessionUser } from "@/lib/auth/require-user";
import { SIGNUP_PATH } from "@/lib/auth/routes";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAccountDeletedFlag } from "@/lib/account/routes";
import { PublicPageShell } from "@/components/PublicPageShell";

type LandingPageProps = {
  searchParams: Promise<{ konto?: string }>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  // Not auth(): a revoked session's JWT would still count there.
  if (await getSessionUser()) {
    redirect("/app");
  }
  const { konto } = await searchParams;

  return (
    <PublicPageShell className="flex max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      {isAccountDeletedFlag(konto) ? (
        <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">
          Ditt konto är borttaget.
        </p>
      ) : null}
      <h1 className="text-4xl font-semibold">Sjung</h1>
      <p className="text-muted-foreground">
        Hantera noter och medverkande tillsammans med din grupp.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/auth/login">Logga in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={SIGNUP_PATH}>Skapa konto</Link>
        </Button>
      </div>
    </PublicPageShell>
  );
}
