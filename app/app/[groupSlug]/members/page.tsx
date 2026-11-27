import { notFound } from "next/navigation";
import { listGroupRoles } from "@/app/actions/group-roles";
import { listGroupInvitations, listGroupMembers } from "@/app/actions/groups";
import { GroupRolesSection } from "@/components/members/GroupRolesSection";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { InviteGroupMemberForm } from "@/components/InviteGroupMemberForm";
import { GroupInvitationsTable } from "@/components/members/GroupInvitationsTable";
import { GroupMembersTable } from "@/components/members/GroupMembersTable";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { findGroupAccess } from "@/lib/group-access";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function GroupMembersPage({ params }: PageProps) {
  const { groupSlug } = await params;
  // Loaded once per request: the list actions below reuse it.
  const access = await findGroupAccess(groupSlug);
  if (!access?.can("viewMembers")) {
    notFound();
  }
  // Inviting and Invitations need MANAGE_MEMBERS; a MANAGE_MEMBER_AUTHORIZATION-only
  // viewer sees just the member list (ADR-0013).
  const managesMembers = access.can("manageMembers");

  const [members, roles, invitations] = await Promise.all([
    listGroupMembers(groupSlug),
    listGroupRoles(groupSlug),
    managesMembers ? listGroupInvitations(groupSlug) : null,
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [createGroupAncestor(groupSlug, access.group.name)],
          tail: { kind: "static", label: "Medlemmar" },
        }}
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Medlemmar</h1>
        {managesMembers ? (
          <p className="text-sm text-muted-foreground">
            Bjud in någon med sin e-postadress. De blir medlemmar när de har tackat ja via länken i mejlet.
          </p>
        ) : null}
      </div>

      {managesMembers ? <InviteGroupMemberForm groupSlug={groupSlug} /> : null}

      <GroupMembersTable groupSlug={groupSlug} members={members} roles={roles} />

      {/* Everyone who can open the page sees the Roles; only MANAGE_MEMBER_AUTHORIZATION changes them. */}
      <GroupRolesSection groupSlug={groupSlug} roles={roles} canManageRoles={access.can("manageRoles")} />

      {invitations ? <GroupInvitationsTable groupSlug={groupSlug} invitations={invitations} /> : null}
    </div>
  );
}
