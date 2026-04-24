import { getPeople } from "@/app/actions/people";
import { CreatePersonDialog } from "@/components/CreatePersonDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PeoplePage() {
  const people = await getPeople();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personer</h1>
        <CreatePersonDialog />
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
