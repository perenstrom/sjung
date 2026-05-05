import { notFound } from "next/navigation";
import { getGroups, listGroupMembers } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { AddGroupMemberForm } from "@/components/AddGroupMemberForm";
import { RemoveGroupMemberDialog } from "@/components/RemoveGroupMemberDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { requireTenantGroup } from "@/lib/tenant-group";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function GroupMembersPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const { userId, groupId } = await requireTenantGroup(groupSlug);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdById: true },
  });
  if (!group || group.createdById !== userId) {
    notFound();
  }

  const [members, groups] = await Promise.all([listGroupMembers(groupSlug), getGroups()]);
  const groupName = groups.find((groupOption) => groupOption.slug === groupSlug)?.name ?? groupSlug;

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>E-post</TableHead>
            <TableHead className="w-[120px] text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Inga medlemmar hittades.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <RemoveGroupMemberDialog
                      groupSlug={groupSlug}
                      member={member}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
