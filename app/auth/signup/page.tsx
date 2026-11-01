import { SignupForm } from "@/components/SignupForm";
import { parseRedirectPathFromValue } from "@/lib/schemas/auth";

type SignupPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;
  const nextPath = parseRedirectPathFromValue(next);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <SignupForm nextPath={nextPath} />
    </main>
  );
}
