/** The user page section where a User manages, and can delete, their account. */
export const ACCOUNT_PATH = "/app/me/account";

/** The start page with its one-off "Ditt konto är borttaget" notice. */
export const ACCOUNT_DELETED_PATH = "/?konto=borttaget";

export function isAccountDeletedFlag(konto: string | undefined): boolean {
  return konto === "borttaget";
}
