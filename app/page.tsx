import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";

export default function Home() {
  return (
    <div className="prose">
      <h1>Hello World2</h1>
      <Table>
        <TableHeader>
          <TableRow className="pbe-0">
            <TableHead>Title</TableHead>
            <TableHead>Composers</TableHead>
            <TableHead>Files</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Abendlied</TableCell>
            <TableCell>Rheinberger</TableCell>
            <TableCell>PDF</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
