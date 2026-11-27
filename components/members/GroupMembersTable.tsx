import { GroupMemberClaimBadges } from "@/components/members/GroupMemberClaimBadges";
import { GroupMemberClaimsDialog } from "@/components/members/GroupMemberClaimsDialog";
import { RemoveGroupMemberDialog } from "@/components/RemoveGroupMemberDialog";
import { GroupMemberRolesDialog } from "@/components/members/GroupMemberRolesDialog";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import { heldClaims, rolesOf, type HeldClaim, type RoleClaims } from "@/lib/group-roles";

export type GroupMembersTableRow = {
  id: string;
  name: string;
  email: string;
  isCreator: boolean;
  /** Whether the viewer may remove this Member from the Group. */
  canRemove: boolean;
  /** Whether the viewer may grant or revoke this Member's individual Claims. */
  canChangeClaims: boolean;
  /** Whether the viewer may give or take this Member's Roles. */
  canChangeRoles: boolean;
  /** The Claims held individually, not through a Role. */
  claims: GroupClaim[];
  roleIds: string[];
};

/** A row with what is worked out from the Group's Roles. */
type MemberView = GroupMembersTableRow & { roleNames: string[]; heldClaims: HeldClaim[] };

const EMPTY_LABEL = "Inga medlemmar hittades.";

/** A Group's Members as a table from `md` up and as the shared mobile list below it. */
export function GroupMembersTable({
  groupSlug,
  members,
  roles,
}: {
  groupSlug: string;
  members: GroupMembersTableRow[];
  /** The Group's Roles, in display order. */
  roles: readonly RoleClaims[];
}) {
  const views: MemberView[] = members.map((member) => ({
    ...member,
    roleNames: rolesOf(member, roles).map((role) => role.name),
    heldClaims: heldClaims(member, roles),
  }));

  return (
    <>
      <MobileList>
        {views.length === 0 ? (
          <MobileListEmpty>{EMPTY_LABEL}</MobileListEmpty>
        ) : (
          views.map((member) => (
            <MobileListRow
              key={member.id}
              primary={member.name}
              secondary={member.email}
              trailing={
                hasActions(member) ? <MemberActions groupSlug={groupSlug} member={member} roles={roles} /> : null
              }
            >
              {member.roleNames.length > 0 ? (
                <p className="mt-1.5 text-sm">Roller: {member.roleNames.join(", ")}</p>
              ) : null}
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
              <TableHead>Roller</TableHead>
              <TableHead>Behörigheter</TableHead>
              <TableHead className="w-[100px] text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {views.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {EMPTY_LABEL}
                </TableCell>
              </TableRow>
            ) : (
              views.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell className="whitespace-normal">
                    {member.roleNames.length > 0 ? (
                      member.roleNames.join(", ")
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <GroupMemberClaimBadges member={member} />
                  </TableCell>
                  <TableCell className="text-right">
                    {hasActions(member) ? (
                      <div className="flex justify-end">
                        <MemberActions groupSlug={groupSlug} member={member} roles={roles} />
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
  return member.canChangeClaims || member.canChangeRoles || member.canRemove;
}

/** The row's actions, each shown only when the viewer may take it. */
function MemberActions({
  groupSlug,
  member,
  roles,
}: {
  groupSlug: string;
  member: MemberView;
  roles: readonly RoleClaims[];
}) {
  return (
    <div className="flex gap-1">
      {member.canChangeRoles ? <GroupMemberRolesDialog groupSlug={groupSlug} member={member} roles={roles} /> : null}
      {member.canChangeClaims ? (
        <GroupMemberClaimsDialog groupSlug={groupSlug} member={member} roleNotes={roleNotes(member.heldClaims)} />
      ) : null}
      {member.canRemove ? <RemoveGroupMemberDialog groupSlug={groupSlug} member={member} /> : null}
    </div>
  );
}

/** "Via <Role>" under each Claim the Member also gets through a Role, for the Claims dialog. */
function roleNotes(held: readonly HeldClaim[]): Partial<Record<GroupClaim, string>> {
  return Object.fromEntries(
    held
      .filter(({ viaRoles }) => viaRoles.length > 0)
      .map(({ claim, viaRoles }) => [claim, `Via ${viaRoles.join(", ")}`]),
  );
}
