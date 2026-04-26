import {
  addPieceToSetList,
  getSetListDetail,
  getSetListPieceOptions,
  removePieceFromSetList,
} from "@/app/actions/setlists";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SetListPiecePicker } from "@/components/SetListPiecePicker";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

function formatSetListDate(date: Date | null): string {
  if (!date) {
    return "–";
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}

export default async function TenantSetListDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [setList, pieces] = await Promise.all([
    getSetListDetail(groupSlug, id),
    getSetListPieceOptions(groupSlug),
  ]);

  if (!setList) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{setList.name}</h1>
        <p className="text-sm text-muted-foreground">Datum: {formatSetListDate(setList.date)}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lägg till stycke</h2>
        <form action={addPieceToSetList} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
          <div className="sm:w-80">
            <SetListPiecePicker pieces={pieces} />
          </div>
          <Button type="submit" disabled={pieces.length === 0}>
            Lägg till
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Stycken</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setList.pieces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Inga stycken i repertoaren ännu.
                </TableCell>
              </TableRow>
            ) : (
              setList.pieces.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.pieceName}</TableCell>
                  <TableCell>
                    <form action={removePieceFromSetList}>
                      <input type="hidden" name="groupSlug" value={groupSlug} />
                      <input type="hidden" name="setListPieceId" value={entry.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Ta bort
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
