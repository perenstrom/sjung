import { notFound } from "next/navigation";
import { getGroups, listGroupMembers } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { AddGroupMemberForm } from "@/components/AddGroupMemberForm";
import { GroupMembersTable } from "@/components/members/GroupMembersTable";
import { canManageGroupMembers } from "@/lib/actions/guards";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { requireTenantGroup } from "@/lib/tenant-group";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function GroupMembersPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const { userId, groupId } = await requireTenantGroup(groupSlug);

  if (!(await canManageGroupMembers(groupId, userId))) {
    notFound();
  }

  const [members, groups] = await Promise.all([listGroupMembers(groupSlug), getGroups()]);
  const groupName = groups.find((groupOption) => groupOption.slug === groupSlug)?.name ?? groupSlug;

  return (
    <div className="space-y-4 md:space-y-6">
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

      <GroupMembersTable groupSlug={groupSlug} members={members} viewerUserId={userId} />
    </div>
  );
}
