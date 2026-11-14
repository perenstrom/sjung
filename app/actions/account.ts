"use server";

import { signOut } from "@/auth";
import { deleteAccount, findCreatorGroups } from "@/lib/account/account-deletion";
import { ACCOUNT_DELETED_PATH } from "@/lib/account/routes";
import { requireUser } from "@/lib/auth/require-user";
import { formDataString } from "@/lib/schemas/form-data";

/** What "Ta bort konto" would do to the viewer's Creator Groups. */
export async function getAccountDeletionPlan() {
  const user = await requireUser();
  return findCreatorGroups(user.id);
}

/** `useActionState` state for the "Ta bort konto" form: `null` until a submit fails. */
export type DeleteAccountState = { error: string } | null;

const BLOCKED = "Du är administratör för en grupp med andra medlemmar. Ta bort gruppen först.";

/**
 * "Ta bort konto", confirmed with the User's password. On success this
 * browser is logged out and lands on the start page; the User's other
 * sessions end on their next request, since their User no longer exists.
 */
export async function deleteOwnAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const user = await requireUser();

  const result = await deleteAccount(user.id, formDataString(formData, "password"));
  if (result.status === "wrong-password") {
    return { error: "Fel lösenord" };
  }
  if (result.status === "blocked") {
    return { error: BLOCKED };
  }

  await signOut({ redirectTo: ACCOUNT_DELETED_PATH });
  return null;
}
