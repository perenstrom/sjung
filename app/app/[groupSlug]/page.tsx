import { getPieces } from "@/app/actions/pieces";
import { getPeople } from "@/app/actions/people";
import { CreatePieceDialog } from "@/components/CreatePieceDialog";
import { DeletePieceDialog } from "@/components/DeletePieceDialog";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { PieceLinksDialog } from "@/components/PieceLinksDialog";
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
  const [pieces, people] = await Promise.all([
    getPieces(groupSlug),
    getPeople(groupSlug),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Noter</h1>
        <CreatePieceDialog people={people} groupSlug={groupSlug} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>Medverkande</TableHead>
            <TableHead className="w-[1%] whitespace-nowrap">Länkar</TableHead>
            <TableHead className="w-[1%] whitespace-nowrap">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pieces.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Inga noter tillagda ännu.
              </TableCell>
            </TableRow>
          ) : (
            pieces.map((piece) => {
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
                  <TableCell>
                    <PieceLinksDialog groupSlug={groupSlug} piece={piece} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditPieceDialog
                        groupSlug={groupSlug}
                        people={people}
                        piece={{
                          id: piece.id,
                          name: piece.name,
                          credits: piece.credits.map((credit) => ({
                            personId: credit.personId,
                            role: credit.role,
                          })),
                        }}
                      />
                      <DeletePieceDialog
                        groupSlug={groupSlug}
                        piece={{ id: piece.id, name: piece.name }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
