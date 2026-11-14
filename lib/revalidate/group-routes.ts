import { revalidatePath } from "next/cache";

import { getSetListIdsContainingPiece } from "@/lib/pieces/queries";
import {
  MY_GROUPS_PATH,
  groupMembersPath,
  groupPeoplePath,
  groupPiecesPath,
  groupSetListPath,
  groupSetListsPath,
} from "@/lib/groups/routes";
import { pieceHref } from "@/lib/pieces/href";

/** Noter: the page listing the Group's Pieces. */
export function revalidateGroupPiecesRoute(groupSlug: string) {
  revalidatePath(groupPiecesPath(groupSlug));
}

export function revalidateGroupPeopleRoutes(groupSlug: string) {
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(groupPeoplePath(groupSlug));
}

export function revalidateGroupSetListsRoutes(groupSlug: string) {
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(groupSetListsPath(groupSlug));
}

export function revalidateGroupSetListDetailRoutes(groupSlug: string, setListId: string) {
  revalidateGroupSetListsRoutes(groupSlug);
  revalidatePath(groupSetListPath(groupSlug, setListId));
}

export function revalidateGroupMembersRoutes(groupSlug: string) {
  revalidatePath(MY_GROUPS_PATH);
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(groupMembersPath(groupSlug));
}

export function revalidateGroupPieceDetailRoutes(groupSlug: string, pieceId: string) {
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(pieceHref(groupSlug, pieceId));
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
    revalidatePath(groupSetListPath(groupSlug, setListId));
  }
}

export function revalidateAppAndMyGroupsRoutes() {
  revalidatePath("/app");
  revalidatePath(MY_GROUPS_PATH);
}

/** Also refreshes the Group's start page, Repertoarer, where its address leads. */
export function revalidateAppAndMyGroupsWithGroupRoute(groupSlug: string) {
  revalidateAppAndMyGroupsRoutes();
  revalidatePath(groupSetListsPath(groupSlug));
}
