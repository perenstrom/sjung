import { notFound } from "next/navigation";
import { listGroupMembers } from "@/app/actions/groups";
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

  const members = await listGroupMembers(groupSlug);

  return (
    <div className="space-y-6">
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
