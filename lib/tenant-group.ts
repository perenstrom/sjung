import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export type TenantGroupContext = {
  userId: string;
  groupId: string;
  groupSlug: string;
};

/** Resolves a tenant group by slug and ensures the current user is a member. */
export async function requireTenantGroup(
  groupSlug: string
): Promise<TenantGroupContext> {
  const user = await requireUser();
  const group = await prisma.group.findFirst({
    where: {
      slug: groupSlug,
      users: { some: { userId: user.id } },
    },
    select: { id: true, slug: true },
  });
  if (!group) {
    notFound();
  }
  return { userId: user.id, groupId: group.id, groupSlug: group.slug };
}

/** Same membership check as {@link requireTenantGroup}, but throws on bad slug for server actions. */
export async function getWritableGroupIdForSlug(groupSlug: string) {
  const user = await requireUser();
  const group = await prisma.group.findFirst({
    where: {
      slug: groupSlug,
      users: { some: { userId: user.id } },
    },
    select: { id: true },
  });
  if (!group) {
    throw new Error("Ogiltig grupp eller saknad behörighet");
  }
  return { userId: user.id, groupId: group.id };
}

export type GroupMutationContext = {
  userId: string;
  groupId: string;
  groupSlug: string;
};

/**
 * Shared server-action prelude: resolve tenant membership, run a guard against
 * the resolved group, then run the mutation against the guarded resource.
 * Callers that need no guard pass `noGuard` from `@/lib/actions/guards`;
 * callers that need to revalidate do so as the last step of `mutation`.
 */
export async function runGroupMutation<TGuard, TResult>(
  groupSlug: string,
  guard: (ctx: GroupMutationContext) => Promise<TGuard>,
  mutation: (ctx: GroupMutationContext, guarded: TGuard) => Promise<TResult>
): Promise<TResult> {
  const { userId, groupId } = await getWritableGroupIdForSlug(groupSlug);
  const ctx: GroupMutationContext = { userId, groupId, groupSlug };
  const guarded = await guard(ctx);
  return mutation(ctx, guarded);
}
