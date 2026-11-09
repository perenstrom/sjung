/** Where an Unverified user is held until they confirm their email address. */
export const VERIFY_EMAIL_PATH = "/auth/verify-email";

/** The emailed verification link's target. Opening it changes nothing; see its page. */
export const CONFIRM_EMAIL_PATH = "/auth/verify-email/confirm";

/** `VERIFY_EMAIL_PATH` with a flag saying signup couldn't send the email. */
export const VERIFY_EMAIL_SEND_FAILED_PATH = `${VERIFY_EMAIL_PATH}?skickat=nej`;

export function isSendFailedFlag(skickat: string | undefined): boolean {
  return skickat === "nej";
}

/** "Glömt lösenord": where a User asks for a reset link. */
export const REQUEST_PASSWORD_RESET_PATH = "/auth/reset-password";

/** The emailed reset link's target. Opening it changes nothing; see its page. */
export const NEW_PASSWORD_PATH = "/auth/reset-password/new";

/** The login page, returning to `next` (an internal path) after logging in. */
export function loginPath(next: string): string {
  return `/auth/login?next=${encodeURIComponent(next)}`;
}

/** Clears a revoked session's cookie and sends the browser to the login page. */
export const SESSION_ENDED_PATH = "/auth/session-ended";
