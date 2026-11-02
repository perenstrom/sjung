import { notFound } from "next/navigation";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { AddGroupMemberForm } from "@/components/AddGroupMemberForm";
import { ClaimsManagementPrototype } from "@/components/prototype/ClaimsManagementPrototype";
import { canManageGroupMembers } from "@/lib/actions/guards";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import prisma from "@/lib/prisma";
import { requireTenantGroup } from "@/lib/tenant-group";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ variant?: string }>;
};

// PROTOTYPE — the member table is swapped for ClaimsManagementPrototype
// (?variant=A|B|C). Claims and creator are read straight from Prisma here
// because listGroupMembers doesn't return them yet.
export default async function GroupMembersPage({ params, searchParams }: PageProps) {
  const { groupSlug } = await params;
  const { variant = "A" } = await searchParams;
  const { userId, groupId } = await requireTenantGroup(groupSlug);

  if (!(await canManageGroupMembers(groupId, userId))) {
    notFound();
  }

  const [group, groups] = await Promise.all([
    prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      select: {
        createdById: true,
        users: {
          select: {
            user: { select: { id: true, name: true, email: true } },
            claims: { select: { claim: true } },
          },
        },
      },
    }),
    getGroups(),
  ]);
  const groupName = groups.find((groupOption) => groupOption.slug === groupSlug)?.name ?? groupSlug;
  const members = group.users.map((row) => ({
    ...row.user,
    claims: row.claims.map(({ claim }) => claim),
  }));

  return (
    <div className="space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [createGroupAncestor(groupSlug, groupName)],
          tail: { kind: "static", label: "Medlemmar" },
        }}
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Medlemmar</h1>
        <p className="text-sm text-muted-foreground">
          Lägg till befintliga användare med exakt e-postadress.
        </p>
      </div>

      <AddGroupMemberForm groupSlug={groupSlug} />

      <ClaimsManagementPrototype
        initialMembers={members}
        creatorId={group.createdById}
        currentUserId={userId}
        variant={variant}
      />
    </div>
  );
}
