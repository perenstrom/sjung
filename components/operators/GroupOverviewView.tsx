import { Boxes } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { MobileList, MobileListRow } from "@/components/ui/mobile-list";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import { formatFileSize } from "@/lib/formatFileSize";
import type { GroupOverview, GroupOverviewRow } from "@/lib/operators/group-overview";

function groupCount(count: number): string {
  return `${count} ${count === 1 ? "grupp" : "grupper"}`;
}

/**
 * Drift › Grupper: every Group's size and activity, as a table from `md` up
 * and the shared mobile list below it. Nothing links into a Group, since
 * Operators have no Group access (ADR-0008).
 */
export function GroupOverviewView({ overview }: { overview: GroupOverview }) {
  const { groups, totalStorageBytes } = overview;

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Grupper</h1>
        {groups.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {groupCount(groups.length)} · {formatFileSize(totalStorageBytes)} totalt
          </p>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Boxes} heading="Inga grupper än">
          Grupper som användare skapar visas här.
        </EmptyState>
      ) : (
        <>
          <MobileList>
            {groups.map((group) => (
              <GroupOverviewMobileRow key={group.id} group={group} />
            ))}
          </MobileList>

          <div className="max-md:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Skapad</TableHead>
                  <TableHead>Administratör</TableHead>
                  <TableHead className="text-right">Medlemmar</TableHead>
                  <TableHead className="text-right">Stycken</TableHead>
                  <TableHead className="text-right">Repertoarer</TableHead>
                  <TableHead className="text-right">Lagring</TableHead>
                  <TableHead>Senast ändrad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <span className="block font-medium">{group.name}</span>
                      <span className="block text-xs text-muted-foreground">{group.slug}</span>
                    </TableCell>
                    <TableCell>{formatDate(group.createdAt)}</TableCell>
                    <TableCell>
                      <span className="block">{group.creator.name}</span>
                      <span className="block text-xs text-muted-foreground">{group.creator.email}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{group.memberCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{group.pieceCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{group.setListCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatFileSize(group.storageBytes)}</TableCell>
                    <TableCell>{formatDate(group.lastChangedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}

/** The mobile row: name and slug, then the columns as short muted lines. */
function GroupOverviewMobileRow({ group }: { group: GroupOverviewRow }) {
  return (
    <MobileListRow primary={group.name} secondary={group.slug}>
      <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
        <p className="truncate">
          {group.creator.name} · {group.creator.email}
        </p>
        <p>
          {group.memberCount} medlemmar · {group.pieceCount} stycken · {group.setListCount} repertoarer ·{" "}
          {formatFileSize(group.storageBytes)}
        </p>
        <p>
          Skapad {formatDate(group.createdAt)} · Ändrad {formatDate(group.lastChangedAt)}
        </p>
      </div>
    </MobileListRow>
  );
}
