import Link from "next/link";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [],
          tail: { kind: "static", label: "Grupphantering" },
        }}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Grupper</h1>
        <CreateGroupDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead className="w-[340px] text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                Inga grupper ännu.
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell className="text-right">
                  {group.isCreator ? (
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/app/${group.slug}/members`}>Medlemmar</Link>
                      </Button>
                      <EditGroupDialog group={{ id: group.id, name: group.name }} />
                      <DeleteGroupDialog group={{ id: group.id, name: group.name }} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
