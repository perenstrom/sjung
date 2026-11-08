import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getSessionUser } from "@/lib/auth/require-user";

/**
 * Where /app sends a browser whose session cookie no longer counts — revoked
 * by a Password reset elsewhere, or its User deleted. Server components can't
 * clear cookies, and proxy.ts would bounce a cookie-holder from the login page
 * straight back to /app, so the stale cookie is cleared here (signOut sets the
 * expired cookie on the redirect it throws). A session that still counts is
 * left alone, so this can't be used to log anyone out.
 */
export async function GET() {
  if (await getSessionUser()) {
    redirect("/app");
  }
  await signOut({ redirectTo: "/auth/login" });
}
