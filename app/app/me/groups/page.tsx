import Link from "next/link";
import { getGroups } from "@/app/actions/groups";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { EditGroupDialog } from "@/components/EditGroupDialog";
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Grupper</h1>
        <CreateGroupDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead className="w-[120px]">Öppna</TableHead>
            <TableHead className="w-[220px] text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Inga grupper ännu.
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>
                  <Link
                    href={`/app/${group.slug}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Öppna
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {group.isCreator ? (
                    <div className="flex justify-end gap-2">
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
