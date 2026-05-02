import Link from "next/link";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseRedirectPathFromFormData,
  parseRedirectPathFromValue,
  parseSignupFormData,
} from "@/lib/schemas/auth";

type SignupPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

function withError(error: string, nextPath: string) {
  return `/auth/signup?error=${encodeURIComponent(error)}&next=${encodeURIComponent(nextPath)}`;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next, error } = await searchParams;
  const nextPath = parseRedirectPathFromValue(next);

  async function signup(formData: FormData) {
    "use server";

    const parsed = parseSignupFormData(formData);
    if (!parsed.ok) {
      redirect(
        withError(parsed.error, parseRedirectPathFromFormData(formData))
      );
    }

    const { name, email, password, redirectTo } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      redirect(withError("E-postadressen används redan", redirectTo));
    }

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        name: name || normalizedEmail,
        email: normalizedEmail,
        passwordHash,
      },
      select: { email: true },
    });

    await signIn("credentials", {
      email: user.email,
      password,
      redirectTo,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <form action={signup} className="w-full space-y-6 rounded-xl border p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Skapa konto</h1>
          <p className="text-sm text-muted-foreground">
            Registrera dig för att komma igång med Sjung.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-2">
          <Label htmlFor="name">Namn</Label>
          <Input id="name" name="name" type="text" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input id="email" name="email" type="email" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Lösenord</Label>
          <Input id="password" name="password" type="password" required />
          <p className="text-sm text-muted-foreground">Minst 12 tecken.</p>
        </div>

        <Button type="submit" className="w-full">
          Skapa konto
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Har du redan konto?{" "}
          <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>
            Logga in
          </Link>
        </p>
      </form>
    </main>
  );
}
