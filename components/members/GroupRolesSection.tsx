import type { GroupRoleRow } from "@/app/actions/group-roles";
import { DeleteGroupRoleDialog } from "@/components/members/DeleteGroupRoleDialog";
import { GroupRoleDialog } from "@/components/members/GroupRoleDialog";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roleClaimSummary } from "@/lib/group-roles";

const EMPTY_LABEL = "Gruppen har inga roller än.";
const HELD_REASON = "Du kan inte ändra en roll som du själv har";

function holdersLabel(count: number): string {
  return count === 1 ? "1 medlem" : `${count} medlemmar`;
}

/**
 * _Roller_ on the members page: every Role with its Claims and how many hold
 * it. Controls show only to a viewer who may manage Roles, disabled on a Role
 * they hold themselves.
 */
export function GroupRolesSection({
  groupSlug,
  roles,
  canManageRoles,
}: {
  groupSlug: string;
  roles: GroupRoleRow[];
  canManageRoles: boolean;
}) {
  function actions(role: GroupRoleRow) {
    if (!canManageRoles) return null;
    const disabledReason = role.canChange ? undefined : HELD_REASON;
    return (
      <div className="flex gap-1">
        <GroupRoleDialog groupSlug={groupSlug} role={role} disabledReason={disabledReason} />
        <DeleteGroupRoleDialog groupSlug={groupSlug} role={role} disabledReason={disabledReason} />
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Roller</h2>
        {canManageRoles ? <GroupRoleDialog groupSlug={groupSlug} /> : null}
      </div>

      <MobileList>
        {roles.length === 0 ? (
          <MobileListEmpty>{EMPTY_LABEL}</MobileListEmpty>
        ) : (
          roles.map((role) => (
            <MobileListRow
              key={role.id}
              primary={role.name}
              secondary={`${roleClaimSummary(role)} · ${holdersLabel(role.holderCount)}`}
              trailing={actions(role)}
            />
          ))
        )}
      </MobileList>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Behörigheter</TableHead>
              <TableHead>Har rollen</TableHead>
              {canManageRoles ? <TableHead className="w-[100px] text-right">Åtgärder</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageRoles ? 4 : 3} className="text-muted-foreground">
                  {EMPTY_LABEL}
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell className="whitespace-normal">{roleClaimSummary(role)}</TableCell>
                  <TableCell>{holdersLabel(role.holderCount)}</TableCell>
                  {canManageRoles ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end">{actions(role)}</div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
