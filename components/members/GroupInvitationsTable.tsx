import { GroupInvitationActions } from "@/components/members/GroupInvitationActions";
import { Badge } from "@/components/ui/badge";
import { MobileList, MobileListRow } from "@/components/ui/mobile-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import type { GroupInvitation } from "@/lib/invitations/invitations";

/** Stands in for a sender whose User was deleted, or an expiry never set. */
const MISSING = "–";

function ExpiredBadge() {
  return <Badge variant="outline">Utgången</Badge>;
}

/**
 * "Inbjudningar": the Group's pending and expired Invitations, as a table from
 * `md` up and as the shared mobile list below it. Renders nothing when there
 * are none.
 */
export function GroupInvitationsTable({
  groupSlug,
  invitations,
}: {
  groupSlug: string;
  invitations: GroupInvitation[];
}) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2 md:space-y-3" aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" className="text-lg font-semibold">
        Inbjudningar
      </h2>

      <MobileList>
        {invitations.map((invitation) => {
          const expiry = formatDate(invitation.expiresAt);
          return (
            <MobileListRow
              key={invitation.id}
              primary={invitation.email}
              secondary={[
                `Från ${invitation.senderName ?? MISSING}`,
                expiry ? `${invitation.expired ? "gick ut" : "går ut"} ${expiry}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              trailing={<GroupInvitationActions groupSlug={groupSlug} invitation={invitation} />}
            >
              {invitation.expired ? (
                <div className="mt-1.5 flex">
                  <ExpiredBadge />
                </div>
              ) : null}
            </MobileListRow>
          );
        })}
      </MobileList>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-post</TableHead>
              <TableHead>Skickad av</TableHead>
              <TableHead>Går ut</TableHead>
              <TableHead className="w-[100px] text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                {/* Wraps so a long address doesn't push the actions out of view. */}
                <TableCell className="whitespace-normal break-all">{invitation.email}</TableCell>
                <TableCell>
                  {invitation.senderName ?? <span className="text-muted-foreground">{MISSING}</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {formatDate(invitation.expiresAt) ?? (
                      <span className="text-muted-foreground">{MISSING}</span>
                    )}
                    {invitation.expired ? <ExpiredBadge /> : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <GroupInvitationActions groupSlug={groupSlug} invitation={invitation} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
