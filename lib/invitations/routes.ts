/** The emailed Invitation link's target. Opening it changes nothing; see its page. */
export const INVITATION_PATH = "/invitation";

export function invitationPagePath(token: string): string {
  return `${INVITATION_PATH}?token=${encodeURIComponent(token)}`;
}
