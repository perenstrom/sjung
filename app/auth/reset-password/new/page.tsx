import { InvalidLinkNotice } from "@/components/InvalidLinkNotice";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { getPasswordResetTokenState } from "@/lib/auth/password-reset";
import { REQUEST_PASSWORD_RESET_PATH } from "@/lib/auth/routes";

type NewPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

// Opening this page must never use up the token: mail scanners open links
// before the human does. The token is only used by the form's POST
// (`setNewPassword`). Same reasoning as the verify-email confirm page.
export default async function NewPasswordPage({ searchParams }: NewPasswordPageProps) {
  const { token } = await searchParams;
  const tokenState = token
    ? await getPasswordResetTokenState(token)
    : { state: "invalid" as const };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <div className="w-full space-y-6 rounded-xl border p-6">
        {tokenState.state === "valid" && token ? (
          <NewPasswordForm token={token} email={tokenState.email} />
        ) : (
          <InvalidLinkNotice
            message="Länken är ogiltig, har redan använts eller har gått ut. Be om en ny."
            newLinkHref={REQUEST_PASSWORD_RESET_PATH}
          />
        )}
      </div>
    </main>
  );
}
