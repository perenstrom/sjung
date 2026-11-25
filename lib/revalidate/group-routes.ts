import { revalidatePath } from "next/cache";

import { getPiecePages, type PiecePages } from "@/lib/pieces/queries";
import {
  MY_GROUPS_PATH,
  groupMembersPath,
  groupPath,
  groupPeoplePath,
  groupPersonPath,
  groupPiecesPath,
  groupSetListPath,
  groupSetListsPath,
} from "@/lib/groups/routes";
import { pieceHref } from "@/lib/pieces/href";

/** Alla noter: the page listing the Group's Pieces. */
export function revalidateGroupPiecesRoute(groupSlug: string) {
  revalidatePath(groupPiecesPath(groupSlug));
}

export function revalidateGroupPeopleRoutes(groupSlug: string) {
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(groupPeoplePath(groupSlug));
}

/** Also refreshes the Person's own page, at its Slug, after it is renamed or deleted. */
export function revalidateGroupPersonRoutes(groupSlug: string, personSlug: string) {
  revalidateGroupPeopleRoutes(groupSlug);
  revalidatePath(groupPersonPath(groupSlug, { slug: personSlug }));
}

/** Home, at the Group's own address. It lists the Current Set lists with their Piece counts. */
export function revalidateGroupHomeRoute(groupSlug: string) {
  revalidatePath(groupPath(groupSlug));
}

/** Also refreshes Home, as any Set list change may change what it shows. */
export function revalidateGroupSetListsRoutes(groupSlug: string) {
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(groupSetListsPath(groupSlug));
  revalidateGroupHomeRoute(groupSlug);
}

export function revalidateGroupSetListDetailRoutes(groupSlug: string, setListSlug: string) {
  revalidateGroupSetListsRoutes(groupSlug);
  revalidatePath(groupSetListPath(groupSlug, { slug: setListSlug }));
}

export function revalidateGroupMembersRoutes(groupSlug: string) {
  revalidatePath(MY_GROUPS_PATH);
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(groupMembersPath(groupSlug));
}

export function revalidateGroupPieceDetailRoutes(groupSlug: string, pieceSlug: string) {
  revalidateGroupPiecesRoute(groupSlug);
  revalidatePath(pieceHref(groupSlug, { slug: pieceSlug }));
}

/**
 * Revalidates every page that shows the piece: the pieces page, the piece's
 * detail page and the detail page of each set list containing it, at their
 * Slugs as they are now.
 */
export async function revalidatePieceRoutes(groupSlug: string, pieceId: string) {
  revalidatePiecePages(groupSlug, await getPiecePages(pieceId));
}

/**
 * {@link revalidatePieceRoutes} for pages looked up beforehand: a delete
 * cascades to the piece's set list entries, so `deletePiece` looks them up
 * before deleting.
 */
export function revalidatePiecePages(groupSlug: string, { pieceSlug, setListSlugs }: PiecePages) {
  revalidateGroupPieceDetailRoutes(groupSlug, pieceSlug);
  for (const setListSlug of setListSlugs) {
    revalidatePath(groupSetListPath(groupSlug, { slug: setListSlug }));
  }
}

/**
 * {@link revalidatePiecePages} after the Piece is deleted: the cascade also
 * changed the Piece counts of the Set lists it was in, which Home shows.
 */
export function revalidateDeletedPiecePages(groupSlug: string, pages: PiecePages) {
  revalidatePiecePages(groupSlug, pages);
  if (pages.setListSlugs.length > 0) {
    revalidateGroupHomeRoute(groupSlug);
  }
}

export function revalidateAppAndMyGroupsRoutes() {
  revalidatePath("/app");
  revalidatePath(MY_GROUPS_PATH);
}

/** Also refreshes the Group's Home. */
export function revalidateAppAndMyGroupsWithGroupRoute(groupSlug: string) {
  revalidateAppAndMyGroupsRoutes();
  revalidateGroupHomeRoute(groupSlug);
}
