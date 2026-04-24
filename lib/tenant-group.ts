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
