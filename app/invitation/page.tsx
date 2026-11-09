import Link from "next/link";
import { acceptGroupInvitation, logOutFromInvitation } from "@/app/actions/invitations";
import { InvalidInvitationNotice } from "@/components/InvalidInvitationNotice";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-user";
import { loginPath } from "@/lib/auth/routes";
import { getInvitationView, type InvitationView } from "@/lib/invitations/invitations";
import { invitationPagePath } from "@/lib/invitations/routes";

type InvitationPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

// Opening this page must never join anyone to anything. Mail scanners (Outlook
// Safe Links, Mimecast, …) open links before the human does, so accept-on-GET
// would let a scanner use up the Invitation — or, for a signed-in scanner
// session, join the wrong account. Joining happens only on the button POST
// (`acceptGroupInvitation`), the same approach as the email confirm page. Don't
// "simplify" this to accept here.
export default async function InvitationPage({ searchParams }: InvitationPageProps) {
  const { token } = await searchParams;
  const viewer = await getSessionUser();
  const view: InvitationView = token ? await getInvitationView(token, viewer) : { state: "invalid" };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 md:px-6">
      <div className="w-full space-y-6 rounded-xl border p-6">
        {view.state === "can-accept" && (
          <form action={acceptGroupInvitation} className="space-y-6">
            <Heading title={`Inbjudan till ${view.groupName}`}>
              Du har bjudits in att gå med i {view.groupName} på Sjung.
            </Heading>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Gå med i {view.groupName}
            </Button>
          </form>
        )}

        {view.state === "sign-in" && token && (
          <>
            <Heading title={`Inbjudan till ${view.groupName}`}>
              Logga in med den e-postadress inbjudan skickades till för att gå med.
            </Heading>
            <Button asChild className="w-full">
              <Link href={loginPath(invitationPagePath(token))}>
                Logga in
              </Link>
            </Button>
          </>
        )}

        {view.state === "wrong-account" && viewer && (
          <form action={logOutFromInvitation} className="space-y-6">
            <Heading title="Inbjudan skickades till en annan adress">
              Du är inloggad som <strong className="text-foreground">{viewer.email}</strong>, men
              inbjudan till {view.groupName} skickades till en annan adress. Logga ut och logga in
              med rätt konto för att gå med.
            </Heading>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="outline" className="w-full">
              Logga ut
            </Button>
          </form>
        )}

        {view.state === "already-member" && (
          <>
            <Heading title={`Du är redan medlem i ${view.groupName}`}>
              Inbjudan är redan använd och du är medlem i gruppen.
            </Heading>
            <Button asChild className="w-full">
              <Link href={`/app/${view.groupSlug}`}>Gå till {view.groupName}</Link>
            </Button>
          </>
        )}

        {view.state === "invalid" && <InvalidInvitationNotice />}
      </div>
    </main>
  );
}

function Heading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
