import Link from "next/link";

import { getPeopleWithPieceCounts } from "@/app/actions/people";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { CreatePersonDialog } from "@/components/CreatePersonDialog";
import { EditModeProvider } from "@/components/EditModeContext";
import { findGroupAccess } from "@/lib/group-access";
import { heldEditCapabilities } from "@/lib/edit-mode";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { groupPersonPath } from "@/lib/groups/routes";
import { formatPieceCount } from "@/lib/pieces/count";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function TenantPeoplePage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [people, groups, access] = await Promise.all([
    getPeopleWithPieceCounts(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider capabilities={heldEditCapabilities(access, ["manageContent"])}>
      <div className="space-y-4 md:space-y-6">
        <BreadcrumbRegistrar
          trail={{
            visibility: "visible",
            ancestors: [createGroupAncestor(groupSlug, groupName)],
            tail: { kind: "static", label: "Upphovspersoner" },
          }}
        />
        <PageHeader
          title="Upphovspersoner"
          editActions={<CreatePersonDialog groupSlug={groupSlug} people={people} />}
        />

        <MobileList>
          {people.length === 0 ? (
            <MobileListEmpty>Inga upphovspersoner tillagda ännu.</MobileListEmpty>
          ) : (
            people.map((person) => (
              <MobileListRow
                key={person.id}
                primary={person.name}
                secondary={formatPieceCount(person.pieceCount)}
                href={groupPersonPath(groupSlug, person)}
              />
            ))
          )}
        </MobileList>

        <div className="max-md:hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead className="text-right">Stycken</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    Inga upphovspersoner tillagda ännu.
                  </TableCell>
                </TableRow>
              ) : (
                people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <Link className="underline" href={groupPersonPath(groupSlug, person)}>
                        {person.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{person.pieceCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </EditModeProvider>
  );
}
