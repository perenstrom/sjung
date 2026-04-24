import { getSheetMusic } from "@/app/actions/sheetMusic";
import { getPeople } from "@/app/actions/people";
import { CreateSheetMusicDialog } from "@/components/CreateSheetMusicDialog";
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

export default async function TenantNoterPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [sheetMusic, people] = await Promise.all([
    getSheetMusic(groupSlug),
    getPeople(groupSlug),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Noter</h1>
        <CreateSheetMusicDialog people={people} groupSlug={groupSlug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>Medverkande</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheetMusic.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                Inga noter tillagda ännu.
              </TableCell>
            </TableRow>
          ) : (
            sheetMusic.map((piece) => {
              const creditsText =
                piece.credits.length > 0
                  ? piece.credits
                      .map((c) => `${c.person.name} (${c.role})`)
                      .join(", ")
                  : "–";
              return (
                <TableRow key={piece.id}>
                  <TableCell>{piece.name}</TableCell>
                  <TableCell>{creditsText}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
