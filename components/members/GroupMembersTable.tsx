import { GroupMemberClaimBadges } from "@/components/GroupMemberClaimBadges";
import { GroupMemberClaimsDialog } from "@/components/GroupMemberClaimsDialog";
import { RemoveGroupMemberDialog } from "@/components/RemoveGroupMemberDialog";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GroupClaim } from "@/app/generated/prisma/enums";

export type GroupMembersTableRow = {
  id: string;
  name: string;
  email: string;
  isCreator: boolean;
  /** Whether the viewer may remove this Member from the Group. */
  canRemove: boolean;
  /** Whether the viewer may grant or revoke this Member's Claims. */
  canChangeClaims: boolean;
  claims: GroupClaim[];
};

const EMPTY_LABEL = "Inga medlemmar hittades.";

/** A Group's Members as a table from `md` up and as the shared mobile list below it. */
export function GroupMembersTable({ groupSlug, members }: { groupSlug: string; members: GroupMembersTableRow[] }) {
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
              trailing={hasActions(member) ? <MemberActions groupSlug={groupSlug} member={member} /> : null}
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
                    {hasActions(member) ? (
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

function hasActions(member: GroupMembersTableRow): boolean {
  return member.canChangeClaims || member.canRemove;
}

/** The row's actions, each shown only when the viewer may take it. */
function MemberActions({ groupSlug, member }: { groupSlug: string; member: GroupMembersTableRow }) {
  return (
    <div className="flex gap-1">
      {member.canChangeClaims ? <GroupMemberClaimsDialog groupSlug={groupSlug} member={member} /> : null}
      {member.canRemove ? <RemoveGroupMemberDialog groupSlug={groupSlug} member={member} /> : null}
    </div>
  );
}
