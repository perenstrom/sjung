import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold">Sjung</h1>
      <p className="text-muted-foreground">
        Hantera noter och medverkande tillsammans med din grupp.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/auth/login">Logga in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/auth/signup">Skapa konto</Link>
        </Button>
      </div>
    </main>
  );
}
