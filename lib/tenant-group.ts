import { notFound } from "next/navigation";
import { findGroupAccess, requireGroupAccess, type GroupAccess } from "@/lib/group-access";

export type TenantGroupContext = {
  userId: string;
  groupId: string;
  groupSlug: string;
};

/** Resolves a tenant group by slug and ensures the current user is a member. */
export async function requireTenantGroup(
  groupSlug: string
): Promise<TenantGroupContext> {
  const access = await findGroupAccess(groupSlug);
  if (!access) {
    notFound();
  }
  return { userId: access.userId, groupId: access.group.id, groupSlug: access.group.slug };
}

/** Same membership check as {@link requireTenantGroup}, but throws on bad slug for server actions. */
export async function getWritableGroupIdForSlug(groupSlug: string) {
  const access = await requireGroupAccess(groupSlug);
  return { userId: access.userId, groupId: access.group.id };
}

export type GroupMutationContext = {
  userId: string;
  groupId: string;
  groupSlug: string;
  /** What the User may do in the Group. */
  access: GroupAccess;
};

/**
 * Server-action prelude for the Group and its Members: resolve tenant
 * membership, run a guard (usually `access.require(...)`), then run the
 * mutation against what the guard returned. Content changes use
 * {@link runContentMutation} instead. Callers that need to revalidate do so as
 * the last step of `mutation`.
 */
export async function runGroupMutation<TGuard, TResult>(
  groupSlug: string,
  guard: (ctx: GroupMutationContext) => Promise<TGuard>,
  mutation: (ctx: GroupMutationContext, guarded: TGuard) => Promise<TResult>
): Promise<TResult> {
  const access = await requireGroupAccess(groupSlug);
  const ctx: GroupMutationContext = {
    userId: access.userId,
    groupId: access.group.id,
    groupSlug,
    access,
  };
  const guarded = await guard(ctx);
  return mutation(ctx, guarded);
}

/**
 * The one entry point for changing a Group's content (Pieces, Set lists,
 * People and everything under them): resolve the User's Group access, require
 * `manageContent` once, then run the mutation. The mutation looks up the rows
 * it touches with `findInGroup`, and revalidates as its last step.
 */
export async function runContentMutation<TResult>(
  groupSlug: string,
  mutation: (ctx: GroupMutationContext) => Promise<TResult>
): Promise<TResult> {
  return runGroupMutation(
    groupSlug,
    async ({ access }) => access.require("manageContent"),
    (ctx) => mutation(ctx)
  );
}
