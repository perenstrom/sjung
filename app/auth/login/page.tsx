import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseLoginFormData,
  parseRedirectPathFromFormData,
  parseRedirectPathFromValue,
} from "@/lib/schemas/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const nextPath = parseRedirectPathFromValue(next);

  async function login(formData: FormData) {
    "use server";

    const parsed = parseLoginFormData(formData);
    if (!parsed.ok) {
      const redirectTo = parseRedirectPathFromFormData(formData);
      redirect(
        `/auth/login?error=Ogiltiga inloggningsuppgifter&next=${encodeURIComponent(
          redirectTo
        )}`
      );
    }

    const { email, password, redirectTo } = parsed.data;

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo,
      });
    } catch (signInError) {
      if (signInError instanceof AuthError) {
        redirect(
          `/auth/login?error=Fel e-post eller lösenord&next=${encodeURIComponent(
            redirectTo
          )}`
        );
      }
      throw signInError;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <form action={login} className="w-full space-y-6 rounded-xl border p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Logga in</h1>
          <p className="text-sm text-muted-foreground">
            Ange e-post och lösenord för att komma till appen.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input id="email" name="email" type="email" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Lösenord</Label>
          <Input id="password" name="password" type="password" required />
        </div>

        <Button type="submit" className="w-full">
          Logga in
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Saknar konto?{" "}
          <Link href={`/auth/signup?next=${encodeURIComponent(nextPath)}`}>
            Skapa konto
          </Link>
        </p>
      </form>
    </main>
  );
}
