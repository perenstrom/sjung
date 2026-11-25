"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { deleteAccount, findCreatorGroups } from "@/lib/account/account-deletion";
import { ACCOUNT_DELETED_PATH, ACCOUNT_PATH } from "@/lib/account/routes";
import { requireUser } from "@/lib/auth/require-user";
import prisma from "@/lib/prisma";
import { userNameSchema } from "@/lib/schemas/auth";
import { formDataString } from "@/lib/schemas/form-data";

/** `useActionState` state for the "Namn" form: `null` until submitted. */
export type ChangeNameState = { status: "saved" } | { status: "error"; error: string } | null;

/**
 * Changes the signed-in User's name. Always their own: the User comes from the
 * session, and any id in the form is ignored. Everyone who sees the name reads
 * it fresh from the database, so it shows everywhere on the next page load.
 */
export async function changeOwnName(_prevState: ChangeNameState, formData: FormData): Promise<ChangeNameState> {
  const user = await requireUser();

  const parsed = userNameSchema.safeParse(formDataString(formData, "name"));
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Namn krävs" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data, updatedById: user.id },
  });
  revalidatePath(ACCOUNT_PATH);
  return { status: "saved" };
}

/** What "Ta bort konto" would do to the viewer's Creator Groups. */
export async function getAccountDeletionPlan() {
  const user = await requireUser();
  return findCreatorGroups(user.id);
}

/** `useActionState` state for the "Ta bort konto" form: `null` until a submit fails. */
export type DeleteAccountState = { error: string } | null;

const BLOCKED_BY_SHARED_GROUP_ERROR = "Du är administratör för en grupp med andra medlemmar. Ta bort gruppen först.";

/**
 * "Ta bort konto", confirmed with the User's password. On success this
 * browser is logged out and lands on the start page; the User's other
 * sessions end on their next request, since their User no longer exists.
 */
export async function deleteOwnAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();

  const result = await deleteAccount(user.id, formDataString(formData, "password"));
  if (result.status === "wrong-password") {
    return { error: "Fel lösenord" };
  }
  if (result.status === "blocked") {
    return { error: BLOCKED_BY_SHARED_GROUP_ERROR };
  }

  await signOut({ redirectTo: ACCOUNT_DELETED_PATH });
  return null;
}
