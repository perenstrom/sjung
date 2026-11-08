import { LoginForm } from "@/components/LoginForm";
import { parseRedirectPathFromValue } from "@/lib/schemas/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    bekraftad?: string;
    aterstallt?: string;
  }>;
};

/** Shown above the form after a flow that ends on the login page. */
const NOTICES = {
  passwordReset: "Ditt lösenord är bytt. Logga in med det nya lösenordet.",
  emailConfirmed: "Din e-postadress är bekräftad. Logga in för att fortsätta.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, bekraftad, aterstallt } = await searchParams;
  const nextPath = parseRedirectPathFromValue(next);
  const notice =
    (aterstallt === "1" && NOTICES.passwordReset) ||
    (bekraftad === "1" && NOTICES.emailConfirmed) ||
    undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <LoginForm nextPath={nextPath} notice={notice} />
    </main>
  );
}
