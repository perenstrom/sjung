import { revalidatePath } from "next/cache";

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

export function revalidateAppAndMyGroupsRoutes() {
  revalidatePath("/app");
  revalidatePath("/app/me/groups");
}

export function revalidateAppAndMyGroupsWithGroupRoute(groupSlug: string) {
  revalidateAppAndMyGroupsRoutes();
  revalidateGroupRoute(groupSlug);
}
