import { LoginForm } from "@/components/LoginForm";
import { parseRedirectPathFromValue } from "@/lib/schemas/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    bekraftad?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, bekraftad } = await searchParams;
  const nextPath = parseRedirectPathFromValue(next);
  const notice =
    bekraftad === "1" ? "Din e-postadress är bekräftad. Logga in för att fortsätta." : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <LoginForm nextPath={nextPath} notice={notice} />
    </main>
  );
}
