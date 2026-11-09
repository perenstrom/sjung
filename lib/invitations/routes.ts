import { SIGNUP_PATH } from "@/lib/auth/routes";

/** The emailed Invitation link's target. Opening it changes nothing; see its page. */
export const INVITATION_PATH = "/invitation";

export function invitationPagePath(token: string): string {
  return `${INVITATION_PATH}?token=${encodeURIComponent(token)}`;
}

/** Signup from an Invitation: the account gets the address the Invitation was sent to. */
export function invitationSignupPath(token: string): string {
  return `${SIGNUP_PATH}?invitation=${encodeURIComponent(token)}`;
}
