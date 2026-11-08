import { GroupMemberClaimBadges } from "@/components/GroupMemberClaimBadges";
import { GroupMemberClaimsDialog } from "@/components/GroupMemberClaimsDialog";
import { RemoveGroupMemberDialog } from "@/components/RemoveGroupMemberDialog";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import { canChangeMember } from "@/lib/groups";

export type GroupMembersTableRow = {
  id: string;
  name: string;
  email: string;
  isCreator: boolean;
  claims: GroupClaim[];
};

const EMPTY_LABEL = "Inga medlemmar hittades.";

/** A Group's Members as a table from `md` up and as the shared mobile list below it. */
export function GroupMembersTable({
  groupSlug,
  members,
  viewerUserId,
}: {
  groupSlug: string;
  members: GroupMembersTableRow[];
  viewerUserId: string;
}) {
  return (
    <>
      <MobileList>
        {members.length === 0 ? (
          <MobileListEmpty>{EMPTY_LABEL}</MobileListEmpty>
        ) : (
          members.map((member) => (
            <MobileListRow
              key={member.id}
              primary={member.name}
              secondary={member.email}
              trailing={
                canChangeMember(member, viewerUserId) ? (
                  <MemberActions groupSlug={groupSlug} member={member} />
                ) : null
              }
            >
              <GroupMemberClaimBadges member={member} empty={null} className="mt-1.5" />
            </MobileListRow>
          ))
        )}
      </MobileList>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Behörigheter</TableHead>
              <TableHead className="w-[100px] text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  {EMPTY_LABEL}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <GroupMemberClaimBadges member={member} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canChangeMember(member, viewerUserId) ? (
                      <div className="flex justify-end">
                        <MemberActions groupSlug={groupSlug} member={member} />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function MemberActions({
  groupSlug,
  member,
}: {
  groupSlug: string;
  member: GroupMembersTableRow;
}) {
  return (
    <div className="flex gap-1">
      <GroupMemberClaimsDialog groupSlug={groupSlug} member={member} />
      <RemoveGroupMemberDialog groupSlug={groupSlug} member={member} />
    </div>
  );
}
