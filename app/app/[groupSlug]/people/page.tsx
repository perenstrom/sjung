import { getPeople } from "@/app/actions/people";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { CreatePersonDialog } from "@/components/CreatePersonDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createGroupAncestor } from "@/lib/breadcrumbs";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function TenantPeoplePage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [people, groups] = await Promise.all([getPeople(groupSlug), getGroups()]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <div className="space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [createGroupAncestor(groupSlug, groupName)],
          tail: { kind: "static", label: "Personer" },
        }}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personer</h1>
        <CreatePersonDialog groupSlug={groupSlug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground">
                Inga personer tillagda ännu.
              </TableCell>
            </TableRow>
          ) : (
            people.map((person) => (
              <TableRow key={person.id}>
                <TableCell>{person.name}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
