import { RequestPasswordResetForm } from "@/components/RequestPasswordResetForm";

/** "Glömt lösenord": asks for the address to email a reset link to. */
export default function RequestPasswordResetPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <RequestPasswordResetForm />
    </main>
  );
}
