import { InvalidInvitationNotice } from "@/components/InvalidInvitationNotice";
import { SignupForm } from "@/components/SignupForm";
import { getInvitationSignup } from "@/lib/invitations/invitations";
import { parseRedirectPathFromValue } from "@/lib/schemas/auth";

type SignupPageProps = {
  searchParams: Promise<{
    next?: string;
    /** An Invitation's accept token: sign up with the invited address and join its Group. */
    invitation?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next, invitation: invitationParam } = await searchParams;

  if (invitationParam !== undefined) {
    // A repeated or empty `invitation` param isn't a link we sent.
    const token = typeof invitationParam === "string" && invitationParam !== "" ? invitationParam : null;
    const invitation = token ? await getInvitationSignup(token) : null;
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
        {token && invitation?.ok ? (
          <SignupForm invitation={{ token, email: invitation.email, groupName: invitation.groupName }} />
        ) : (
          <div className="w-full space-y-6 rounded-xl border p-6">
            <InvalidInvitationNotice />
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <SignupForm nextPath={parseRedirectPathFromValue(next)} />
    </main>
  );
}
