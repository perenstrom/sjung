"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { setActiveGroupSlugCookie } from "@/lib/active-group-cookie";
import { getSessionUser } from "@/lib/auth/require-user";
import { loginPath } from "@/lib/auth/routes";
import { acceptInvitation } from "@/lib/invitations/invitations";
import { INVITATION_PATH, invitationPagePath } from "@/lib/invitations/routes";
import { revalidateAppAndMyGroupsWithGroupRoute } from "@/lib/revalidate/group-routes";

function tokenFrom(formData: FormData): string | null {
  const token = formData.get("token");
  return typeof token === "string" && token !== "" ? token : null;
}

/**
 * The accept page's "Gå med" button — the only place an Invitation token is
 * used. Takes Unverified users too (not `requireUser()`): accepting from the
 * invited inbox is what proves the address, so it also makes them Verified.
 */
export async function acceptGroupInvitation(formData: FormData) {
  const token = tokenFrom(formData);
  if (!token) {
    redirect(INVITATION_PATH);
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(loginPath(invitationPagePath(token)));
  }

  const result = await acceptInvitation(token, user);
  if (!result.ok) {
    // Back to the link page, which explains what's wrong.
    redirect(invitationPagePath(token));
  }

  // The new Group becomes the User's Default group.
  await setActiveGroupSlugCookie(result.groupSlug);
  revalidateAppAndMyGroupsWithGroupRoute(result.groupSlug);
  redirect(`/app/${result.groupSlug}`);
}

/** "Logga ut" on an Invitation sent to another address: log out, then show the link again. */
export async function logOutFromInvitation(formData: FormData) {
  const token = tokenFrom(formData);
  await signOut({ redirectTo: token ? invitationPagePath(token) : INVITATION_PATH });
}
