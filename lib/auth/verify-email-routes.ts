/** Where an Unverified user is held until they confirm their email address. */
export const VERIFY_EMAIL_PATH = "/auth/verify-email";

/** The emailed link's target. Opening it changes nothing; see its page. */
export const CONFIRM_EMAIL_PATH = "/auth/verify-email/confirm";

/** `VERIFY_EMAIL_PATH` with a flag saying signup couldn't send the email. */
export const VERIFY_EMAIL_SEND_FAILED_PATH = `${VERIFY_EMAIL_PATH}?skickat=nej`;

export function isSendFailedFlag(skickat: string | undefined): boolean {
  return skickat === "nej";
}
