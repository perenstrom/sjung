import { LoginForm } from "@/components/LoginForm";
import { parseRedirectPathFromValue } from "@/lib/schemas/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = parseRedirectPathFromValue(next);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
