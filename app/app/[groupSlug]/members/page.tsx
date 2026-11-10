import { notFound } from "next/navigation";
import { listGroupInvitations, listGroupMembers } from "@/app/actions/groups";
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
  if (!access?.can("manageMembers")) {
    notFound();
  }

  const [members, invitations] = await Promise.all([
    listGroupMembers(groupSlug),
    listGroupInvitations(groupSlug),
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
        <p className="text-sm text-muted-foreground">
          Bjud in någon med sin e-postadress. De blir medlemmar när de har tackat ja via länken i mejlet.
        </p>
      </div>

      <InviteGroupMemberForm groupSlug={groupSlug} />

      <GroupMembersTable groupSlug={groupSlug} members={members} />

      <GroupInvitationsTable groupSlug={groupSlug} invitations={invitations} />
    </div>
  );
}
