import { revalidatePath } from "next/cache";

import { getSetListIdsContainingPiece } from "@/lib/pieces/queries";

export function revalidateGroupRoute(groupSlug: string) {
  revalidatePath(`/app/${groupSlug}`);
}

export function revalidateGroupPeopleRoutes(groupSlug: string) {
  revalidateGroupRoute(groupSlug);
  revalidatePath(`/app/${groupSlug}/people`);
}

export function revalidateGroupSetListsRoutes(groupSlug: string) {
  revalidateGroupRoute(groupSlug);
  revalidatePath(`/app/${groupSlug}/setlists`);
}

export function revalidateGroupSetListDetailRoutes(groupSlug: string, setListId: string) {
  revalidateGroupSetListsRoutes(groupSlug);
  revalidatePath(`/app/${groupSlug}/setlists/${setListId}`);
}

export function revalidateGroupMembersRoutes(groupSlug: string) {
  revalidatePath("/app/me/groups");
  revalidateGroupRoute(groupSlug);
  revalidatePath(`/app/${groupSlug}/members`);
}

export function revalidateGroupPieceDetailRoutes(groupSlug: string, pieceId: string) {
  revalidateGroupRoute(groupSlug);
  revalidatePath(`/app/${groupSlug}/pieces/${pieceId}`);
}

/**
 * Revalidates every page that shows the piece: the pieces page, the piece's
 * detail page and the detail page of each set list containing it. A delete
 * cascades to the piece's set list entries, so `deletePiece` passes the set
 * list ids it looked up before deleting.
 */
export async function revalidatePieceRoutes(
  groupSlug: string,
  pieceId: string,
  setListIds?: string[]
) {
  const containingSetListIds = setListIds ?? (await getSetListIdsContainingPiece(pieceId));
  revalidateGroupPieceDetailRoutes(groupSlug, pieceId);
  for (const setListId of containingSetListIds) {
    revalidatePath(`/app/${groupSlug}/setlists/${setListId}`);
  }
}

export function revalidateAppAndMyGroupsRoutes() {
  revalidatePath("/app");
  revalidatePath("/app/me/groups");
}

export function revalidateAppAndMyGroupsWithGroupRoute(groupSlug: string) {
  revalidateAppAndMyGroupsRoutes();
  revalidateGroupRoute(groupSlug);
}
