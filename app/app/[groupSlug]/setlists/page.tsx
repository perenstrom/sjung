import { getSetLists } from "@/app/actions/setlists";
import { CreateSetListDialog } from "@/components/CreateSetListDialog";
import { DeleteSetListDialog } from "@/components/DeleteSetListDialog";
import { EditSetListDialog } from "@/components/EditSetListDialog";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

function formatSetListDate(date: Date | null): string {
  if (!date) {
    return "–";
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}

export default async function TenantSetListsPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const setLists = await getSetLists(groupSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Repertoarer</h1>
        <CreateSetListDialog groupSlug={groupSlug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead className="w-[1%] whitespace-nowrap">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {setLists.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Inga repertoarer tillagda ännu.
              </TableCell>
            </TableRow>
          ) : (
            setLists.map((setList) => (
              <TableRow key={setList.id}>
                <TableCell>
                  <Link
                    href={`/app/${groupSlug}/setlists/${setList.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {setList.name}
                  </Link>
                </TableCell>
                <TableCell>{formatSetListDate(setList.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <EditSetListDialog groupSlug={groupSlug} setList={setList} />
                    <DeleteSetListDialog
                      groupSlug={groupSlug}
                      setList={{ id: setList.id, name: setList.name }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
